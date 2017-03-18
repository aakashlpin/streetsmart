const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');

const UserModel = mongoose.model('User');

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: `${process.env.SERVER}/auth/twitter/callback`,
}, (token, tokenSecret, profile, done) => {
  UserModel.findOne(profile._json, (err, user) => {
    if (err) { return done(err); }
    done(null, user);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: `${process.env.SERVER}/auth/facebook/callback`,
  enableProof: false,
  profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
}, (accessToken, refreshToken, profile, done) => {
  if (process.env.ADMIN_EMAIL_IDS.indexOf(profile._json.email) !== -1) {
    UserModel.findOne({ email: profile._json.email }, (err, user) => done(err, user));
  } else {
    return done(null, null);
  }
}
));


passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  UserModel.findById(id, (err, user) => {
    done(err, user);
  });
});
