/**
 * Created by arik.blumin on 4/6/2016.
 */
/**
 * Created by arik.blumin on 3/31/2016.
 */
var Q = require("q");
//var logger;
var winston = require('winston');
var logger = winston;
var accountId;
var proxy = process.env.http_proxy ? process.env.http_proxy : undefined;
var collectedCookies = {collectedCookies: []};
var parameters = {parameters: {}};
var utils = require('./../utils.js');
var globals = require('./../globals.js');
var request = require('request');
var moment = require('moment');
var _ = require('lodash');
var xsrf = null;

var isParallel = false;


Account.prototype.getCloudAccount = function () {



  var urlC = "https://secure.dome9.com/api/cloudaccounts";
  var requestOptions =new globals.RequestOptions(urlC,'GET',null,xsrf);

  return this.connection.requestV2WebApi(requestOptions.reqOpts)


};

function Account (dome9Connection){
  this.connection=dome9Connection;
}

module.exports = {
  Account:Account
}