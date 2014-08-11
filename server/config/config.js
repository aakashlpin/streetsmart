'use strict';

var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development',
_ = require('underscore');

var commonConfig = {
    root: rootPath,
    app: {
        name: 'streetsmart'
    },
    port: 6000,
    kuePort: 6001,
    server: 'https://cheapass.in',
    postmarkAPIKey: '158085c4-5a95-4c9f-a9b7-f600e218c017',
    youtubeDLSites: ['8tracks.com', '9gag.com', '9gag.tv', 'bandcamp.com',
     'blip.tv', 'collegehumor.com', 'cc.com', 'dailymotion.com',
     'discovery.com', 'engadget.com', 'extremetube.com', 'funnyordie.com',
     'imdb.com', 'justin.tv', 'twitch.tv', 'keezmovies.com', 'khanacademy.org',
     'kickstarter.com', 'lynda.com', 'metacafe.com', 'mtv.com', 'pornhub.com',
     'pornhd.com', 'pornotube.com', 'rottentomatoes.com', 'soundcloud.com',
     'spankwire.com', 'ted.com', 'tube8.com', 'udemy.com', 'vh1.com',
     'vimeo.com', 'vuclip.com', 'xtube.com', 'youtube.com'],
    videoSites: {
        hornbunny: {
            url: 'hornbunny.com'
        },
        xvideos: {
            url: 'xvideos.com'
        },
        youporn: {
            url: 'youporn.com'
        },
        xhamster: {
            url: 'xhamster.com'
        },
        xnxx: {
            url: 'xnxx.com'
        },
        redtube: {
            url: 'redtube.com'
        }
    },
    sellers: {
        flipkart: {
            url: 'flipkart.com',
            key: 'affid',
            value: 'aakashlpi',
            requiresUserAgent: false,
            cronPattern: {
                'development': '0-59/5 * * * *',
                'production': '0-59/30 * * * *'
            }
        },
        amazon: {
            url: 'amazon.in',
            key: 'tag',
            value: 'cheapass0a-21',
            requiresUserAgent: false,
            hasProductAPI: true,
            cronPattern: {
                'development': '1-59/5 * * * *',
                'production': '0 0-23/1 * * *'
            }
        },
        myntra: {
            url: 'myntra.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '2-59/5 * * * *',
                'production': '0 0-23/3 * * *'
            }
        },
        jabong: {
            url: 'jabong.com',
            key: null,
            value: null,
            requiresUserAgent: true,
            cronPattern: {
                'development': '3-59/5 * * * *',
                'production': '15 0-23/3 * * *'
            }
        },
        fabfurnish: {
            url: 'fabfurnish.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '4-59/5 * * * *',
                'production': '30 0-23/3 * * *'
            }
        },
        infibeam: {
            url: 'infibeam.com',
            key: 'trackId',
            value: 'aaka',
            requiresUserAgent: false,
            cronPattern: {
                'development': '6-59/5 * * * *',
                'production': '45 0-23/3 * * *'
            }
        },
        bajaao: {
            url: 'bajaao.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '7-59/5 * * * *',
                'production': '0 1-23/3 * * *'
            }
        },
        pepperfry: {
            url: 'pepperfry.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '8-59/5 * * * *',
                'production': '15 1-23/3 * * *'
            }
        },
        snapdeal: {
            url: 'snapdeal.com',
            key: 'aff_id',
            value: '12129',
            extraParams: '&utm_source=aff_prog&utm_campaign=afts&offer_id=17',
            requiresUserAgent: false,
            cronPattern: {
                'development': '9-59/5 * * * *',
                'production': '30 1-23/3 * * *'
            }
        }
    }
};

var config = {
    development: {
        db: 'mongodb://localhost/streetsmart-development',
        isCronActive: false  //use this to control running of cron jobs
    },

    production: {
        db: 'mongodb://localhost/streetsmart-production',
        isCronActive: true
    }
};

_.extend(config.development, commonConfig);
_.extend(config.production, commonConfig);

module.exports = config[env];
