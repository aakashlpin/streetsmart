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
    emailService: 'ses',   //postmark, mandrill, mailgun, ses
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
    TWITTER_FEED: {
      CONSUMER_KEY: 'cGdGa5jdWWqDczrxkMUVuR3oJ',
      CONSUMER_SECRET: 'Q5OocHZnlIBKmLIhJgTwNGy7u9MH8zfWdkk82zt1wc14xGvFGe',
      ACCESS_TOKEN: '4058882718-HG0Yr0IwxwGjSm28Mp9iDMDYd6VhgYdqbQ6VKCj',
      ACCESS_TOKEN_SECRET: '1uTGLPiVBsepizWG2LPmDx6RolQCt47nWLkkPfmy9hwmV'
    },
    BITLY: {
      CLIENT_ID: '166519637297f08da483c95c2066af6e8c25f2c3',
      CLIENT_SECRENT: 'a8b2103d2a55e4455d19f1c35d76709e6b54e7e6',
      ACCESS_TOKEN: '62741fff7968a4721e5f52dad73ab2e590df12ca'
    },
    PARSE: {
        APP_ID: 'EnpAUwXNnLdWsPulrCQB1h0Y1ijqkHjFd1N1Ep6Q',
        CLIENT_KEY: 'ZPCn3dme4W7EcRcNfIU70qipHfR5Stk1S3AeYNgs',
        JAVASCRIPT_KEY: 'Dn6nmUKcPuygo6g8ncLRwCioUTfciPG0c5lzLHjB',
        REST_KEY: 'flapt5SCbN0Qf0QfuhBpuEJVtsH828xY8FLSey0M'
    },
    processFullContactInterval: {
        'development': '0 0-23/1 * * *',
        'production': '0 2-23/6 * * *'
    },
    processDealsInterval: {
        'development': '3-59/5 * * * *',
        'production': '3-59/15 * * * *'
    },
    processRemoteSyncInterval: {
        'development': '19 0 * * *',
        'production': '0 0 * * *'
    },
    processAllProductsInterval: {
        'development': '0-59/5 * * * *',
        'production': '20 * * * *'
    },
    createAndSendDailyReportInterval: {
        'development': '0 0 * * *',
        'production': '0 0 * * *'
    },
    proxy: 'http://e8ed50e08e444e22a3f13b546196a2c7:@proxy.crawlera.com:8010',
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
                'production': '9 0-23/4 * * *'
            }
        },
        amazon: {
            name: 'Amazon.in',
            url: 'amazon.in',
            key: 'tag',
            value: 'cheapass0a-21',
            requiresUserAgent: false,
            requiresCookies: false,
            hasProductAPI: false,
            hasDeepLinking: true,
            requiresProxy: true,
            cronPattern: {
                'development': '39 0-23/1 * * *',
                'production': '45 0-23/4 * * *'
            }
        },
        myntra: {
            name: 'Myntra.com',
            url: 'myntra.com',
            otherUrls: ['mynt.to'],
            key: null,
            value: null,
            requiresCookies: true,
            requiresUserAgent: true,
            hasProductAPI: false,
            hasDeepLinking: false,
            cronPattern: {
                'development': '39 0-23/1 * * *',
                'production': '55 0-23/4 * * *'
            }
        },
        healthkart: {
            name: 'HealthKart',
            url: 'healthkart.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            hasProductAPI: false,
            cronPattern: {
                'development': '0-59/3 * * * *',
                'production': '40 0-23/3 * * *'
            }
        },
        zivame: {
            name: 'Zivame',
            url: 'zivame.com',
            key: null,
            value: null,
            requiresUserAgent: false,
            hasProductAPI: false,
            cronPattern: {
                'development': '0-59/3 * * * *',
                'production': '10 0-23/3 * * *'
            }
        },
        jabong: {
            name: 'Jabong',
            url: 'jabong.com',
            otherUrls: ['jbo.ng'],
            key: null,
            value: null,
            requiresCookies: true,
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
     'vimeo.com', 'vuclip.com', 'xtube.com', 'youtube.com', 'xvideos.com',
     'hornbunny.com', 'youporn.com', 'xhamster.com', 'xnxx.com', 'redtube.com']
};

var config = {
    development: {
        db: 'mongodb://localhost/streetsmart-development',
        isCronActive: true  //use this to control running of cron jobs
    },
    production: {
        db: 'mongodb://localhost/streetsmart-production',
        isCronActive: true
    }
};

_.extend(config.development, commonConfig);
_.extend(config.production, commonConfig);

module.exports = config[env];
