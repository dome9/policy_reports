/**
 * Created by arik.blumin on 4/6/2016.
 */
var Q = require('q');
var utils = require('./utils.js');
var program = require('commander');
var login={
  username:'',
  password:''
};
var fields = ['externalId', 'name', 'region',
  'externalId', 'field2', 'field3',
  'externalId', 'field2', 'field3',
  'externalId', 'field2'];
program
  .arguments('<file>')
    .option('-f, --file <file>', 'the result file path, such as ./myDir/report/csv')
    .option('-r, --report <report>', 'the report type you would like to get')
    .option('-u, --username <username>', 'Dome9 username')
    .option('-p, --password <password>', 'Dome9 password')

  program.parse(process.argv);

var path = program.file||'./report.csv';
var type = program.type||'./instances';
login.password= program.password;
login.username= program.username;

console.log(path);

utils.getInputs(login)
  .then(function (conf) {
    utils.selector(type,conf)
      .then(function(data){
        utils.createCsv(data,undefined,path)
          .then(function () {
            process.exit(0);
          },function(err){
            console.error(err);
            process.exit(1);
          })
      },function(err){
        console.error(err);
        process.exit(1);
      })
  });





