const isProd = process.env.NODE_ENV === 'production';
const env = isProd ? 'production' : 'development';
const CONFIG = require('./configuration.json');
CONFIG.baseUrl = isProd ? 'https://forever.pyppe.fi' : 'http://localhost:3000';
CONFIG.port    = isProd ? 3003 : 3000;
CONFIG.isProduction = isProd;
CONFIG.env = env;
CONFIG.bookmarkletVersion = '2016-03-05'; // update when breaking changes in bookmarket.js

module.exports = CONFIG;
