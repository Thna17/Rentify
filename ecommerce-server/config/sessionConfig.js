const session = require('express-session');
const cookieConfig = require('./cookieConfig');

module.exports = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...cookieConfig,
  },
});
