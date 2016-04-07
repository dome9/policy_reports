/**
 * Created by arik.blumin on 4/6/2016.
 */
var Q = require('q');
var utils = require('./utils.js');
var dome9connection = require('./services/dome9-connection.js');
var account = require('./services/account.js');
var cloudInstance = require('./services/instances.js');
var cloudSecurityGroups = require('./services/cloudSecurityGroups.js');
var fields = ['externalId', 'name', 'region',
  'externalId', 'field2', 'field3',
  'externalId', 'field2', 'field3',
  'externalId', 'field2'];

utils.getInputs()
  .then(function(conf){
    dome9connection = new dome9connection(conf.username, conf.password, conf._APIKey);
    account = new account.Account(dome9connection);
    cloudInstance = new cloudInstance(dome9connection);
    cloudSecurityGroups = new cloudSecurityGroups(dome9connection);

    account.getCloudAccount();


    Q.all([cloudInstance.get(),cloudSecurityGroups.get()])
      .then(function(data){
        data = {instances:data[0],securityGroups:data[1]}
        utils.createCsv(cloudInstance.logic(data))
          .then(function(){
            process.exit(0);
          })
      },function(err){
        console.log(err);
        process.exit(1);
      })
  });





