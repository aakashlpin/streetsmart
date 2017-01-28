module.exports = function (shipit) {
  require('shipit-deploy')(shipit);

  shipit.initConfig({
    default: {
      workspace: '/tmp/github-monitor',
      deployTo: '/tmp/deploy_to',
      branch: 'upgrade/everthing',
      repositoryUrl: 'https://github.com/aakashlpin/streetsmart.git',
      ignores: ['.git', 'node_modules'],
      rsync: ['--del'],
      keepReleases: 2,
      key: '/Users/aakashlpin/.ssh/id_rsa',
      shallowClone: true
    },
    production: {
      servers: 'aakashlpin@139.59.10.255'
    }
  });

  shipit.task('start', function () {
    return shipit.remote('cd /tmp/deploy_to/current && yarn && bower install && grunt').then(function () {
      shipit.remote('cd /tmp/deploy_to/current/server && yarn && mkdir logs && npm start').then(function () {
        shipit.log('all done');
      })
    })
  })
}
