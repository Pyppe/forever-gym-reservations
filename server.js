const google = require('googleapis');
const googleOAuth2 = google.auth.OAuth2;
const calendar = google.calendar('v3');
const uuid = require('uuid');
const _ = require('lodash');
const crypto = require('crypto');
const Cachd = require('cachd');
const exphbs = require('express-handlebars');
const fs = require('fs');
const reservationCache = new Cachd({
  ttl: 1000*60*30, // max age millis
  maxLength: 2000,
  removalStrategy: 'oldest'
});
const CONFIG = require('./config.js');
const PATHS = {
  googleOauthCallback: "/google/oauthcallback"
};

const googleOauth = () => new googleOAuth2(CONFIG.google.client_id,
                                           CONFIG.google.client_secret,
                                           `${CONFIG.baseUrl}${PATHS.googleOauthCallback}`);

function generateGoogleAuthUrl() {
  return googleOauth().generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
}

function logUserInfo(auth, reservations) {
  google.oauth2('v2').userinfo.v2.me.get({
    auth: auth
  }, (err, user) => {
    if (err) {
      console.log('ERROR getting userinfo: ' + err);
    } else {
      console.log(`User ${user.name} (${user.link}) authenticated with ${_.size(reservations)} reservations`);
    }
  });
}

const StatusCode = {
  BAD_REQUEST    : 400,
  INTERNAL_ERROR : 500
};

const pageParams = (function() {
  const startTime = new Date().getTime();
  const bookmarklet = fs.readFileSync('dist/bookmarklet.js').toString()
  return params => _.assign({
    Global: {
      ApplicationStartTime: startTime,
      Bookmarklet: bookmarklet
    }
  }, params || {});
})();

function mockEvent() {
  return {
    summary: 'Pyppe testaa',
    location: 'Forever Järvenpää',
    description: 'This is my test line.\n2nd line.',
    start: {
      dateTime: '2016-02-13T09:00:00',
      timeZone: 'Europe/Helsinki'
    },
    end: {
      dateTime: '2016-02-13T09:30:00',
      timeZone: 'Europe/Helsinki'
    },
    iCalUID: 'pyppetestaa@forever-gym-reservations'
  };
}

function fetchEvents(auth, calendarId, callback) {
  calendar.events.list({
    auth: auth,
    calendarId: calendarId || 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    q: 'forever-gym-reservations',
    orderBy: 'startTime'
  }, callback);
}

function fetchCalendarList(auth, callback) {
  calendar.calendarList.
    list({auth: auth, minAccessRole: 'owner'}, (err, response) => {
      var calendars = [];
      if (!err) {
        calendars = _.sortBy(response.items, ['primary', 'summary']);
      }
      callback(err, calendars);
    });
}

const RequiredReservationFields = ['summary', 'location', 'description', 'startTime', 'endTime'];

const isValidReservation = (reservation) => _.every(RequiredReservationFields, key => _.has(reservation, key));
const md5 = str => crypto.createHash('md5').update(str).digest("hex");

const asGoogleEvent = (reservation) => {
  const finnishDate = d => {
    return {dateTime: d, timeZone: 'Europe/Helsinki'};
  }
  return _.assign(_.pick(reservation, 'summary', 'location', 'description'), {
    start: finnishDate(reservation.startTime),
    end: finnishDate(reservation.endTime),
    source: {
      title: 'forever-gym-reservations',
      url: 'https://forever.pyppe.fi'
    },
    iCalUID: md5(_.map(_.without(RequiredReservationFields, 'description'), f => reservation[f]).join(',')) + '@forever-gym-reservations'
  });
};

const express = require('express');
const app = express();
app.use(require('body-parser').json());
app.use(require('express-session')({
  genid: req => uuid.v4(),
  resave: false,
  saveUninitialized: true,
  secret: CONFIG.session.secret
}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static('dist'));

app.get('/', (req, res) => {
  /*
  res.send({
    reservationId: req.session.reservationId,
    reservations: reservationCache.get(req.session.reservationId)
  });
  */
  res.render('index', pageParams({
    message: 'Jou, jou'
  }));
});

app.get('/test-google', (req, res) => {
  res.redirect(302, generateGoogleAuthUrl());
});

app.get('/authenticate', (req, res) => {
  req.session['reservationId'] = req.query.id;
  res.redirect(302, generateGoogleAuthUrl());
});

app.get('/mock', (req, res) => {
  req.session['reservations'] = ['testing'];
  res.send('session saved?');
});

app.post('/reservations', (req, res) => {
  const reservations = req.body;
  const validData = _.isArray(reservations) && _.every(reservations, isValidReservation);
  if (validData) {
    const id = uuid.v4();
    reservationCache.set(id, reservations);
    res.send({id: id});
  } else {
    res.status(StatusCode.BAD_REQUEST).send('ERROR');
  }
});

app.get('/kalenterit', (req, res) => {
  const calendars = require('./mocked-calendars');
  res.render('calendars', pageParams({calendars: calendars}));
});

app.get(PATHS.googleOauthCallback, (req, res) => {
  const client = googleOauth();
  client.getToken(req.query.code, (err, tokens) => {
    if (!err) {
      console.log(tokens);
      client.setCredentials(tokens);
      fetchEvents(client, 'primary', (err, response) => {
        console.log(err);
        console.log(response);
      });

      const reservations = reservationCache.get(req.session.reservationId) || [];
      fetchCalendarList(client, (err, calendars) => {
        if (err) {
          res.status(StatusCode.INTERNAL_ERROR, "Google-kalentereiden haku epäonnistui.");
          return;
        }
        res.render('calendars', pageParams({calendars: calendars}));
      });

      /*
      logUserInfo(client, reservations);
      const events = _.map(reservations, asGoogleEvent);
      var readyCount = 0;
      const serveResponse = () => {
        if (readyCount === events.length) {
          res.header("Content-Type", "text/html");
          res.send([
            `OK: Google-kalenteriin tallennettiin ${events.length} ${events.length === 1 ? 'varaus' : 'varausta'}.`,
            `Katso <a href="https://calendar.google.com/">Google-kalenteri</a>.`
          ].join('\n'));
        }
      };

      if (_.size(events) === 0) serveResponse();

      _.forEach(events, event => {
        calendar.events.import({
          auth: client,
          calendarId: 'primary',
          resource: event
        }, (err, response) => {
          readyCount++;
          if (err) {
            console.error('Error: %o', err);
            res.status(StatusCode.INTERNAL_ERROR).send(err);
            return;
          } else {
            serveResponse();
          }
        });
      });
      */
    }
  });
});


app.listen(CONFIG.port, () => {
  console.log(`forever-gym-reservations (${CONFIG.env}) listening on port ${CONFIG.port}!`);
});
