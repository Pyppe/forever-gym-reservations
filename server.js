const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar('v3');
const auth = require('./client_secret.json').web;

var oauth2Client = new OAuth2(auth.client_id, auth.client_secret, 'http://localhost:3000/oauthcallback');

function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: ['https://www.googleapis.com/auth/calendar']
  });
}

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
    iCalUID: 'pyppetestaa@forever-reservations'
  };
}

function fetchEvents(auth, callback) {
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, callback);
}



const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/test', (req, res) => {
  res.redirect(302, generateAuthUrl());
});

app.get('/oauthcallback', (req, res) => {
  oauth2Client.getToken(req.query.code, (err, tokens) => {
    if (!err) {
      oauth2Client.setCredentials(tokens); // TODO: Cannot be global!
      /*
      fetchEvents(oauth2Client, (err, response) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        var events = response.items;
        res.send(events);
      });
      */
      calendar.events.import({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: mockEvent()
      }, (err, response) => {
        if (err) {
          console.error('Error: %o', err);
          res.status(500).send(err);
          return;
        }
        res.send(response);
      });
    }
  });
});


app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

