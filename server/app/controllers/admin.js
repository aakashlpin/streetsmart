const mongoose = require('mongoose');
const Emails = require('./emails');

const JobModel = mongoose.model('Job');

module.exports = {
  index(req, res) {
    res.render('adminIndex.html');
  },
  dashboard(req, res) {
    res.render('adminDashboard.html', {
      baseUrl: process.env.SERVER,
    });
  },
  reminderEmail(req, res) {
    const { email } = req.query;
    if (!email) {
      return res.json({ error: 'Error! Expected an email' });
    }

    Emails.sendReminderEmail({ email }, (err) => {
      if (err) {
        return res.json({ err });
      }
      const userUpdate = { email };
      const updateWith = { isReminded: true };
      const updateOptions = { multi: true };
      JobModel.update(userUpdate, updateWith, updateOptions, (err, updatedDocs) => {
        if (err) {
          return res.json({ error: err });
        }
        return res.json({ status: 'ok', updatedDocs });
      });
    });
  },
};
