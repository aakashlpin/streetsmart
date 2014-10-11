var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var config = require('./config/config');

passport.use(new TwitterStrategy({
		consumerKey: config.TWITTER_CONSUMER_KEY,
		consumerSecret: config.TWITTER_CONSUMER_SECRET,
		callbackURL: "https://cheapass.in/auth/twitter/callback"
	},
	function(token, tokenSecret, profile, done) {
		UserModel.findOne(profile._json, function(err, user) {
			if (err) { return done(err); }
			done(null, user);
		});
	}
));

passport.use(new FacebookStrategy({
		clientID: config.FACEBOOK_APP_ID,
		clientSecret: config.FACEBOOK_APP_SECRET,
		callbackURL: "https://cheapass.in/auth/facebook/callback",
		enableProof: false
	},
	function(accessToken, refreshToken, profile, done) {
		if (config.adminsFacebookEmailIds.indexOf(profile._json.email) !== -1) {
			UserModel.findOne({ email: profile._json.email }, function (err, user) {
				return done(err, user);
			});
		} else {
			return done(null, null);
		}
	}
));

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	UserModel.findById(id, function(err, user) {
		done(err, user);
	});
});
