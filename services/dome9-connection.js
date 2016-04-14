/**
 * Created by Moshi on 3/3/2016.
 */
var globals = require('./../globals');
var logger = globals.logger;
var utils = require('./../utils');
var rp = require('request-promise');
var Q = require('q');
var _ = require('lodash');

function Dome9Connection(username, password, apiKey, mfa) {
  this.username = username;
  this.password = password;
  this.apiKey = apiKey;
  this.mfa = mfa;
  //this.isLoggedIn = false;
  this.loginPromise = null;
  this.authenticationCookie = [];
  this.xsrfToken = null;
  this.requestVerificationToken = null;
}

Dome9Connection.prototype.login = function () {
  var self = this;

  this.loginPromise = utils.doLogin(self.authenticationCookie, {}, logger, this.username, this.password, this.mfa);

  return this.loginPromise;
};

Dome9Connection.prototype.requestV2WebApi = function (requestOptions) {
  if (!this.loginPromise) {
    this.login();
  }

  return this.loginPromise.then(function () {
    requestOptions = utils.addCookies(requestOptions, this.authenticationCookie, logger);
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers['X-XSRF-TOKEN'] = this.xsrfToken;
    requestOptions.resolveWithFullResponse = true;
    return rp(requestOptions).then(function (data) {
      return data.body;
    }, function (reason) {
      if (reason.statusCode == 504) {
        requestOptions.resolveWithFullResponse = false;
        logger.warn('got error trying to perform request: ' + JSON.stringify(requestOptions));
        logger.warn('error was: ' + JSON.stringify(reason));
        logger.warn('retrying request');
        return rp(requestOptions);
      } else {
        throw reason;
      }
    });
  }.bind(this), function (err) {
    console.log('failed to login', err);
    throw err;
  });
};

Dome9Connection.prototype.requestV1 = function (requestOptions) {

  if (!this.apiKey) {
    return Q.fcall(function () {
      throw 'Cannot send V1 request without an API key';
    });
  }

  var authorizationHeaderValue = "Basic " + new Buffer(this.username + ":" + this.apiKey).toString('base64');

  requestOptions.headers = requestOptions.headers || {};
  requestOptions.headers['Authorization'] = authorizationHeaderValue;

  requestOptions.resolveWithFullResponse = true;
  return rp(requestOptions).then(function (data) {
    return data.body;
  }, function (reason) {
    if (reason.statusCode == 504) {
      requestOptions.resolveWithFullResponse = false;
      logger.warn('got error trying to perform request: ' + JSON.stringify(requestOptions));
      logger.warn('error was: ' + JSON.stringify(reason));
      logger.warn('retrying request');
      return rp(requestOptions);
    } else {
      throw reason;
    }
  });
};

Dome9Connection.prototype.requestV1WebApi = function (requestOptions) {
  if (requestOptions.method != 'GET') {
    if (!this.requestVerificationToken) {
      return Q.fcall(function () {
        throw 'Cannot send request of method: ' + requestOptions.method + ', without a __RequestVerificationToken';
      });
    }
    requestOptions.form = requestOptions.form || {};
    requestOptions.form.__RequestVerificationToken = this.requestVerificationToken;
  }

  requestOptions = utils.addCookies(requestOptions, this.authenticationCookie, logger);
  requestOptions.resolveWithFullResponse = true;
  return rp(requestOptions).then(function (data) {
    return data.body;
  }, function (reason) {
    if (reason.statusCode == 504) {
      requestOptions.resolveWithFullResponse = false;
      logger.warn('got error trying to perform request: ' + JSON.stringify(requestOptions));
      logger.warn('error was: ' + JSON.stringify(reason));
      logger.warn('retrying request');
      return rp(requestOptions);
    } else {
      throw reason;
    }
  });
};

module.exports = Dome9Connection;