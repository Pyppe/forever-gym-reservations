const google = require('googleapis');
const calendar = google.calendar('v3');
const uuid = require('uuid');
const moment = require('moment');
moment.locale('fi');
const _ = require('lodash');
const crypto = require('crypto');
const Cachd = require('cachd');
const exphbs = require('express-handlebars');
const fs = require('fs');
const winston = require("winston");
const AppCache = new Cachd({
  ttl: 1000*60*30, // max age millis
  maxLength: 2000,
  removalStrategy: 'oldest'
});
const CONFIG = require('./config.js');
const ICAL_UID_SUFFIX = '@forever-gym-reservations';
const PATHS = {
  googleOauthCallback: "/google/oauthcallback"
};

winston.loggers.add('server', {
  console: {
    colorize: 'true',
    timestamp: true
  }
});
const logger = winston.loggers.get('server');

const googleOauth = () => new google.auth.OAuth2(CONFIG.google.client_id,
                                                 CONFIG.google.client_secret,
                                                 `${CONFIG.baseUrl}${PATHS.googleOauthCallback}`);

const debug = (title, json) => {
  if (!CONFIG.isProduction) {
    console.log(title);
    console.log(JSON.stringify(json, null, 2));
    console.log('=======================');
    console.log('');
  }
};

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
      logger.error('ERROR getting userinfo: ' + err);
    } else {
      logger.info(`User ${user.name} (${user.link}) authenticated with ${_.size(reservations)} reservations`);
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
  const formatTime = (start, end) => `${moment(start).format('ddd D.M.YYYY [klo] HH:mm')} - ${moment(end).format('HH:mm')}`
  return params => _.assign({
    Global: {
      ApplicationStartTime: startTime,
      Bookmarklet: bookmarklet
    },
    helpers: {
      reservationTime: reservation => formatTime(reservation.startTime, reservation.endTime),
      eventTime: event => formatTime(event.start.dateTime, event.end.dateTime),
      unsafeNewLinesToBrs: text => text.replace(/[\n\r]/g, '<br/>')
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
    iCalUID: 'pyppetestaa'+ICAL_UID_SUFFIX
  };
}

function fetchEvents(auth, calendarId, callback) {
  calendar.events.list({
    auth: auth,
    calendarId: calendarId || 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    q: 'forever',
    orderBy: 'startTime'
  }, callback);
}

function findExistingReservationEvents(auth, calendarId, callback) {
  calendar.events.list({
    auth: auth,
    calendarId: calendarId || 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 100,
    singleEvents: true,
    q: 'forever',
    orderBy: 'startTime'
  }, (err, response) => {
    var events = [];
    if (!err) {
      events = _.filter(response.items, event => _.endsWith(event.iCalUID, ICAL_UID_SUFFIX));
    }
    callback(err, events);
  });
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
    iCalUID: md5(_.map(_.without(RequiredReservationFields, 'description'), f => reservation[f]).join(',')) + ICAL_UID_SUFFIX
  });
};
const authenticatedGoogleClient = (req) => {
  const credentials = AppCache.get(`google-auth-${req.session.id}`);
  if (credentials) {
    const client = googleOauth();
    client.setCredentials(credentials);
    return client;
  }
  return null;
};

const express = require('express');
const app = express();
app.use(require('body-parser').json());
app.use(require('client-sessions')({
  cookieName: 'session',
  secret: CONFIG.session.secret,
  duration: 1000 * 60 * 30,
  activeDuration: 1000 * 60 * 5
}));
/*
app.use(require('express-session')({
  genid: req => uuid.v4(),
  resave: false,
  saveUninitialized: true,
  secret: CONFIG.session.secret
}));
*/
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static('dist'));

app.get('/', (req, res) => {
  res.render('index', pageParams({
    message: 'Jou, jou'
  }));
});

app.get('/test-google', (req, res) => {
  res.redirect(302, generateGoogleAuthUrl());
});

app.get('/authenticate', (req, res) => {
  req.session['id'] = req.query.id;
  res.redirect(302, generateGoogleAuthUrl());
});

app.post('/reservations', (req, res) => {
  const reservations = req.body;
  const validData = _.isArray(reservations) && _.every(reservations, isValidReservation);
  if (validData) {
    const id = uuid.v4();
    AppCache.set(id, reservations);
    res.send({id: id});
  } else {
    res.status(StatusCode.BAD_REQUEST).send('ERROR');
  }
});

app.post('/api/google/sync-reservations', (req, res) => {
  const id = req.session.id;
  const auth = authenticatedGoogleClient(req);
  const calendarId = req.body.calendarId;
  const cancelledEventIds = req.body.cancelledEventIds;
  const reservations = AppCache.get(id);
  const totalRequestCount = _.size(cancelledEventIds) + _.size(reservations);
  var readyCount = 0;
  var errorCount = 0;

  const asyncCallback = (err, response) => {
    readyCount++;
    if (err) {
      logger.error(`Error synchronizing reservations: ${err}`);
      errorCount++;
    } else {
      debug('sync-reservations-callback', response)
    }
    if (readyCount === totalRequestCount) {
      res.send({errors: errorCount});
    }
  };

  if (totalRequestCount === 0) {
    res.send({errors: 0});
    return;
  }

  _.forEach(cancelledEventIds, eventId => {
    calendar.events.delete({
      auth, eventId, calendarId
    }, asyncCallback);
  });

  _.forEach(_.map(reservations, asGoogleEvent), resource => {
    calendar.events.import({
      auth, calendarId, resource
    }, asyncCallback);
  });

});

app.get('/playground', (req, res) => {
  req.session.id = 'mocked';
  const readJson = f => JSON.parse(fs.readFileSync(`pyppe/${f}`).toString());
  AppCache.set(`google-auth-${req.session.id}`, readJson('credentials.json'));
  const reservations = readJson('mocked-reservations.json');
  AppCache.set(req.session.id, reservations);
  res.render('import', pageParams({
    calendars: readJson('mocked-calendars.json'),
    reservations: _.map(reservations, r => {
      r.event = asGoogleEvent(r);
      return r;
    })
  }));
});

app.get('/api/google/cancelled-events', (req, res) => {
  findExistingReservationEvents(authenticatedGoogleClient(req), req.query.calendarId, (err, events) => {
    if (err) {
      res.status(StatusCode.INTERNAL_ERROR).send('ERROR');
      return;
    }
    const currentReservationUids = _.map(AppCache.get(req.session.id), r => asGoogleEvent(r).iCalUID);
    const eventNoLongerExists = e => _.findIndex(currentReservationUids, id => id === e.iCalUID) === -1;
    const cancelledEvents = _.filter(events, eventNoLongerExists);
    if (req.query.html) {
      if (_.size(cancelledEvents) > 0) {
        res.render('cancelled-events', pageParams({layout: false, events: cancelledEvents}));
      } else {
        res.send('');
      }
    } else {
      res.send(cancelledEvents);
    }
  });

});

app.get('/synkronoi-kalenteriin', (req, res) => {
  const client = authenticatedGoogleClient(req);
  const reservations = AppCache.get(req.session.id) || [];
  if (!client) {
    res.render('import', pageParams({
      reservations: reservations
    }));
  } else {
    fetchCalendarList(client, (err, calendars) => {
      if (err) {
        res.status(StatusCode.INTERNAL_ERROR, "Google-kalentereiden haku epäonnistui.");
        return;
      }
      debug('CALENDARS', calendars);
      res.render('import', pageParams({
        calendars: calendars,
        reservations: _.map(reservations, r => {
          r.event = asGoogleEvent(r);
          return r;
        })
      }));
    });
  }
});

app.get(PATHS.googleOauthCallback, (req, res) => {
  const client = googleOauth();
  client.getToken(req.query.code, (err, credentials) => {
    if (!err) {
      client.setCredentials(credentials);
      debug('CREDENTIALS', credentials);
      AppCache.set(`google-auth-${req.session.id}`, credentials);
      const reservations = AppCache.get(req.session.id) || [];
      debug('RESERVATIONS', reservations);
      logUserInfo(client, reservations);
      res.redirect('/synkronoi-kalenteriin');
    }
  });
});


app.listen(CONFIG.port, () => {
  logger.info(`forever-gym-reservations (${CONFIG.env}) listening on port ${CONFIG.port}!`);
});
