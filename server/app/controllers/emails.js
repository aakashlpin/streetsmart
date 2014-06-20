module.exports = {
    send: function(user, product, callback) {
        var path         = require('path')
        , templatesDir   = path.resolve(__dirname, '..', 'templates')
        , emailTemplates = require('email-templates')
        , nodemailer     = require('nodemailer');

        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);
            } else {

                // ## Send a single email

                // Prepare nodemailer transport object
                var transport = nodemailer.createTransport("SMTP", {
                    service: "Gmail",
                    auth: {
                        user: "aakash.lpin@gmail.com",
                        pass: "unnxguhjdeeflxua"
                    }
                });

                // An example users object with formatted email function
                var locals = {
                    user: user,
                    product: product
                };

                // Send a single email
                template('notifier', locals, function(err, html, text) {
                    if (err) {
                        callback(err);
                    } else {
                        transport.sendMail({
                            from: 'Flipkart StreetSmart <aakash.lpin@gmail.com>',
                            to: locals.user.email,
                            subject: 'Price change notification for ' + locals.product.name,
                            html: html,
                            // generateTextFromHTML: true,
                            text: text
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus.message);
                            }
                        });
                    }
                });
            }
        });
    }
}
