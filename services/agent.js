/**
 * Created by arik.blumin on 4/6/2016.
 */

var utils = require('./../utils.js');
var Q = require('q');
var globals = require('./../globals');
var logger = globals.logger;
var _ = require('lodash');

function get(id){
  var url = "https://secure.dome9.com/api/Agent";
  if(id){
    url += '/' + id;
  }
  var requestOptions = {
    url: url,
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    json: true
  };

  return Q(this.connection.requestV2WebApi(requestOptions)).fail(function(reason){
    throw 'cannot perform dome9/Agent.get, reason:' + JSON.stringify(reason);
  });
}

function Agent(dome9Connection){
  this.connection = dome9Connection;
}

Agent.prototype = {
  get: get
};

module.exports = function(dome9Connection){
  return new Agent(dome9Connection);
};


