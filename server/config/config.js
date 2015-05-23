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
    server: {
        development: 'http://local.cheapass.in',
        production: 'https://cheapass.in'
    },
    fullContactRateLimit: 1,    //1 per second
    fullContactAPIKeys: ['72583672489b86d6'],
    postmarkAPIKey: '158085c4-5a95-4c9f-a9b7-f600e218c017',
    mandrillAPIKey: 'HLv4dCzPFJy7mA8Xw8j25A',
    mailgunAPIKey: 'key-3aebcaba9791934933932eed487d5b4d',
    googleServerAPIKey: 'AIzaSyBLmBJdysKJY7RWqsh_3Ku4YChcqLB7u6I',
    googleProjectNumber: '596203593464',
    sellerCronWorkerLog: 'seller cron',
    jobRemovedLog: 'job removed',
    emailService: 'mailgun',   //postmark or mandrill
    QoSCheckInterval: 30,   //in minutes
    cpuClusterSize: 2,
    TWITTER_CONSUMER_KEY: 'mPlfFk9ALcWHfCWoZFm5HrwvV',
    TWITTER_CONSUMER_SECRET: 'vermpfs0YmIfDrXU4ebZiuNEOASIvOYFExqtpN1bf1aeFbmkqd',
    FACEBOOK_APP_ID: '244555115743180',
    FACEBOOK_APP_SECRET: 'c36b7d49a79ecdae990a6a41077eae51',
    adminsFacebookEmailIds: ['aakash.lpin@gmail.com'],
    AWS_ACCESS_KEY_ID: 'AKIAIFTVMHU7YXZR6HUQ',
    AWS_SECRET_ACCESS_KEY: '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',
    AWS_BUCKET_PREFIX: 'http://cheapass-india.s3.amazonaws.com/',
    processFullContactInterval: {
        'development': '0 0-23/1 * * *',
        'production': '0 2-23/6 * * *'
    },
    processDealsInterval: {
        'development': '3-59/5 * * * *',
        'production': '3-59/15 * * * *'
    },
    processAllProductsInterval: {
        'development': '0-59/5 * * * *',
        'production': '20 * * * *'
    },
    sellers: {
        flipkart: {
            name: 'Flipkart',
            url: 'flipkart.com',
            key: 'affid',
            value: 'aakashlpi',
            requiresUserAgent: true,
            requiresCookies: false,
            hasDeepLinking: true,
            cronPattern: {
                'development': '0-59/1 * * * *',
                'production': '9 0-23/1 * * *'
            }
        },
        amazon: {
            name: 'Amazon India',
            url: 'amazon.in',
            key: 'tag',
            value: 'cheapass0a-21',
            requiresUserAgent: false,
            hasProductAPI: false,
            hasDeepLinking: true,
            cronPattern: {
                'development': '0-59/3 * * * *',
                'production': '30 0-23/2 * * *'
            }
        },
        myntra: {
            name: 'Myntra',
            url: 'myntra.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '2-59/5 * * * *',
                'production': '45 0-23/3 * * *'
            }
        },
        jabong: {
            name: 'Jabong',
            url: 'jabong.com',
            key: null,
            value: null,
            requiresUserAgent: true,
            cronPattern: {
                'development': '3-59/5 * * * *',
                'production': '25 0-23/3 * * *'
            }
        },
        fabfurnish: {
            name: 'FabFurnish',
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
            name: 'Infibeam',
            url: 'infibeam.com',
            key: 'trackId',
            value: 'aaka',
            requiresUserAgent: false,
            cronPattern: {
                'development': '1-59/5 * * * *',
                'production': '5 0-23/3 * * *'
            }
        },
        bajaao: {
            name: 'Bajaao',
            url: 'bajaao.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '2-59/5 * * * *',
                'production': '20 1-23/3 * * *'
            }
        },
        pepperfry: {
            name: 'Pepperfry',
            url: 'pepperfry.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            cronPattern: {
                'development': '3-59/5 * * * *',
                'production': '15 1-23/3 * * *'
            }
        },
        snapdeal: {
            name: 'Snapdeal',
            url: 'snapdeal.com',
            key: 'aff_id',
            value: '12129',
            extraParams: '&utm_source=aff_prog&utm_campaign=afts&offer_id=17',
            requiresUserAgent: true,
            hasDeepLinking: true,
            cronPattern: {
                'development': '4-59/5 * * * *',
                'production': '40 1-23/3 * * *'
            }
        }
    },
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
    }
};

var config = {
    development: {
        db: 'mongodb://localhost:27019/streetsmart-production',
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
