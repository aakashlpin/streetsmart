

const request = require('request');

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  let reloadPort = 35729,
    files;

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    develop: {
      server: {
        file: 'app.js',
      },
    },
    watch: {
      options: {
        nospawn: true,
        livereload: reloadPort,
      },
      js: {
        files: [
          'app.js',
          'app/**/*.js',
          'config/*.js',
        ],
        tasks: ['develop', 'delayed-livereload'],
      },
      jade: {
        files: ['app/views/**/*.jade'],
        options: { livereload: reloadPort },
      },
    },
  });

  grunt.config.requires('watch.js.files');
  files = grunt.config('watch.js.files');
  files = grunt.file.expand(files);

  grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function () {
    const done = this.async();
    setTimeout(() => {
      request.get(`http://localhost:${reloadPort}/changed?files=${files.join(',')}`, (err, res) => {
        const reloaded = !err && res.statusCode === 200;
        if (reloaded) { grunt.log.ok('Delayed live reload successful.'); } else { grunt.log.error('Unable to make a delayed live reload.'); }
        done(reloaded);
      });
    }, 500);
  });

  grunt.registerTask('default', ['develop', 'watch']);
};
