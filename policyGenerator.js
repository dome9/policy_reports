/**
 * Created by arik.blumin on 4/6/2016.
 */
var Q = require('q');
var utils = require('./utils.js');
var program = require('commander');
var globals = require('./globals');
var logger = globals.logger;
var login = {
  username: '',
  password: '',
  mfa: undefined
};
var fields = ['externalId', 'name', 'region',
  'externalId', 'field2', 'field3',
  'externalId', 'field2', 'field3',
  'externalId', 'field2'];
program
  .option('-f, --file <file>', 'the result file path, such as ./myDir/report/csv')
  .option('-r, --report <report>', 'the report type to be generate.' +
    ' The supported reports are: instances, securityGroups, rds, nacl, ' +
    'subnet-nacl, agent-securityGroups, hostBase, lambda and elbs')
  .option('-u, --username <username>', 'Dome9 username')
  .option('-p, --password <password>', 'Dome9 password')
  .option('-m, --mfa <mfa>', 'mfa')

program.parse(process.argv);

var path = program.file;
var type = program.report || './instances';
login.password = program.password;
login.username = program.username;
login.mfa = program.mfa;

// Redirect all console log messages into the standard error. in order to use the standard out for the tools result.
// Note - this is also implemented in the winston logging - but implemented here too since there are occurences of console.log in the code.
console.log = console.error;
console.info = console.error;
console.warn = console.error;

utils.getInputs(login)
  .then(function (conf) {
    utils.selector(type, conf)
      .then(function (data) {
        utils.createCsv(data, path)
          .then(function () {
            logger.info('Report was created');
            process.exit(0);
          }, function (err) {
            console.error(err);
            process.exit(1);
          })
      }, function (err) {
        console.error(err);
        process.exit(1);
      })
  });





