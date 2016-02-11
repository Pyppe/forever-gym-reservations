var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
const auth = require('./client_secret.json').web;

var oauth2Client = new OAuth2(auth.client_id, auth.client_secret, 'http://localhost:3000/callback');

function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: ['https://www.googleapis.com/auth/calendar']
  });
}



const express = require('express');
const app = express();
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/test', function (req, res) {
  res.redirect(302, generateAuthUrl());
});

app.get('/callback', function (req, res) {
  console.log(req);
  res.send(JSON.strigify(req));
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

