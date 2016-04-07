var cookieParser = require('cookie');
var Q = require("q");
var request = require('request');
var rp = require('request-promise');
var _ = require('lodash');
var collectedCookies, parameters, logger;
var proxy = process.env.http_proxy ? process.env.http_proxy : undefined;
var globals = require('./globals.js');
var dome9ReqList=[];
var prompt = require('prompt');
var fs = require('fs');
var async = require('async');


function loadFromFile(filename) {
  var fs = require('fs');
  var file = __dirname + '/' + filename;
  var newdata = fs.readFileSync(file, 'utf8');
  return newdata;
};

exports.loadFromFile = function (filename) {
  return loadFromFile(filename);
};




function addCookie(collectedCookies, cookie) {
  var cookieFlag = false;
  var nameCookie = cookie[0].split(";")[0].split("=")[0];
  for (var cookieIdx = 0; cookieIdx < collectedCookies.length; cookieIdx++) {
    if (collectedCookies[cookieIdx][0].indexOf(nameCookie) >= 0) {
      collectedCookies[cookieIdx] = cookie;
      cookieFlag = true;
    }
  }
  if (cookieFlag === false) {
    collectedCookies.push(cookie);
  }
}

exports.addCookie = function(collectedCookies, cookie) {
  return addCookie(collectedCookies, cookie);
}

function addCookies(reqOpts,collectedCookies,logger) {
  for (var cookieIdx = 0; cookieIdx < collectedCookies.length; cookieIdx++) {
    var cookieDomain = cookieParser.parse(collectedCookies[cookieIdx][0]).Domain;
    if ((undefined === cookieDomain) || (("" === cookieDomain)) || (reqOpts.url.indexOf(cookieDomain) >= 0)) {
      reqOpts.headers = reqOpts.headers || {};
      if (undefined !== reqOpts.headers['Cookie'])
        reqOpts.headers['Cookie'] = reqOpts.headers['Cookie'] + collectedCookies[cookieIdx][0].split(";")[0] + ";"
      else
        reqOpts.headers['Cookie'] = collectedCookies[cookieIdx][0].split(";")[0] + ";"
    }
  }
  return reqOpts;
}

exports.addCookies= function (reqOpts,collectedCookies,logger) {
  return addCookies(reqOpts,collectedCookies,logger);
}

function doFirstRequest(collectedCookies, parameters, logger){
  var deferred = Q.defer();

  var reqOpts = {
    url: "https://secure.dome9.com/account/logon",
    proxy: proxy,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'
    }
  };

  request(reqOpts, function (err, res, body) {
    if (err) {
      logger.error('request on url %s error %s %s',reqOpts.method, reqOpts.url, JSON.stringify(err));
      deferred.reject(err);
    }
    else if (undefined !== res) {
      logger.info('Processing request for tokens in Cookies...%s %s',reqOpts.method, reqOpts.url);

      if ((res.statusCode === 304) || (res.statusCode === 302) || (res.statusCode === 200)) {
        logger.info('status Response ok:',res.statusCode);
      }
      else {
        logger.error('status Response is NOT ok - ', res.statusCode);
      }

      if ((undefined !== res.headers) && (undefined !== res.headers['set-cookie'] )) {
        addCookie(collectedCookies, res.headers['set-cookie']);
      }
      if ((undefined !== res.headers) && (undefined !== res.headers['Set-Cookie'] )) {
        addCookie(collectedCookies, res.headers['Set-cookie']);
      }

      globals.dome9AuthenticationCookies = collectedCookies;
      deferred.resolve();
    }

  });

  return deferred.promise;
}

function doSecondRequest(collectedCookies, parameters, logger,username,password) {
  var deferred = Q.defer();
  var reqOpts = {
    url: "https://secure.dome9.com/account/logon",
    proxy: proxy,
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36',
      'Content-Type': "application/x-www-form-urlencoded",
      'Referer':"https://secure.dome9.com/account/logon"
    }
  };

  reqOpts = addCookies(reqOpts,collectedCookies,logger);
  reqOpts.body = 'UserName='+encodeURIComponent(username)+'&Password='+encodeURIComponent(password) ;
  request(reqOpts, function (err, res, body) {
    if (err) {
      logger.error('request on url %s error %s %s',reqOpts.method, reqOpts.url, JSON.stringify(err));
      deferred.reject(err);
    }
    else if (undefined !== res) {
      logger.info('Processing request for tokens in Cookies...%s %s',reqOpts.method, reqOpts.url);

      if ((res.statusCode === 304) || (res.statusCode === 302) || (res.statusCode === 200)) {
        logger.info('status Response ok:',res.statusCode);
      }
      else {
        logger.error('status Response is NOT ok - ', res.statusCode);
      }

      if ((undefined !== res.headers) && (undefined !== res.headers['set-cookie'] )) {
        addCookie(collectedCookies, res.headers['set-cookie']);
      }
      if ((undefined !== res.headers) && (undefined !== res.headers['Set-Cookie'] )) {
        addCookie(collectedCookies, res.headers['Set-cookie']);
      }
      logger.info("log-in is done");
      deferred.resolve();
    }

  });
  return deferred.promise;
}

function doLogin(collectedCookies, parameters, logger,username,password) {
  // doing logon
  return doFirstRequest(collectedCookies, parameters, logger).then( function(){
    return doSecondRequest(collectedCookies, parameters, logger,username,password);
  });
}


function reqManager(requestOptionsIn){
  var deferred = Q.defer();
  dome9ReqList.push(requestOptionsIn);
  reqExecuter

}
exports.doLogin = function (collectedCookies, parameters, logger,username,password) {
  return doLogin(collectedCookies, parameters, logger,username,password);
};

function basicRequestProcess(err,res,body,collectedCookies, parameters, logger,reqOpts) {

  if (err) {
    logger.error('request on url %s error %s %s', reqOpts.method, reqOpts.url, JSON.stringify(err));
    return err;
  }
  else if (undefined !== res) {
    logger.info('Processing request...%s %s', reqOpts.method, reqOpts.url);

    if ((res.statusCode === 304) || (res.statusCode === 302) || (res.statusCode === 200)) {
      logger.info('status Response  ok');
    }
    else {
      logger.error('status Response is NOT ok - ', res.statusCode);
      return (new Error('status Response is NOT ok - ', res.statusCode));
    }
    if ((undefined !== res.headers) && (undefined !== res.headers['set-cookie'] )) {
      addCookie(collectedCookies, res.headers['set-cookie']);
    }
    if ((undefined !== res.headers) && (undefined !== res.headers['Set-Cookie'] )) {
      addCookie(collectedCookies, res.headers['Set-cookie']);
    }
  }
  return;
}

/**
 * this function return a promise that will return a promise that will be resolved only if the evaluationFunction return a promise that is resolved.
 * @param evaluationFunction - should be a function that return a promise, the wait until promise will be resolved only after this function will return a promise that will be resolved
 * @param intervalMS
 * @param timeoutMS
 * @returns {*}
 */


exports.basicRequestProcess = function (err,res,body,collectedCookies, parameters, logger,reqOpts) {
  return basicRequestProcess(err,res,body,collectedCookies, parameters, logger,reqOpts);
}

exports.loadFile = function(fileName) {
  var fs = require('fs');
  var file = __dirname + '/' + fileName;
  var newdata = fs.readFileSync(file, 'utf8');
  return newdata;
}

function RequestOptions(url, method, body,xsrf) {
  this.reqOpts = {
    //url: 'https://' + utils.getConfiguration().username + ':' + utils.getConfiguration().APIKey +
    //'@'+  utils.getConfiguration().baseAPIUrl + 'titan-leases/f7b335e1-82bf-4166-a94e-8f8eb4a4e6c8?format=json;',
    url: url,
    proxy: proxy,
    method: method,
    json: body,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'X-XSRF-TOKEN': xsrf
    }
  }
}

exports.getInputs = function (login) {
  return getInputs(login);
};
function getInputs(login){
  var deferred = Q.defer();
  if(login.password&&login.username) deferred.resolve(login);
  var properties = [
    {
      name: 'username',
      validator: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      warning: 'Username must be only letters, spaces, or dashes'
    },
    {
      name: 'password',
      hidden: true
    }
  ];

  prompt.start();

  prompt.get(properties, function (err, result) {
    if (err) { return onErr(err); }
    console.log('Command-line input received:');
    var conf={
      username:result.username,
      password:result.password
    }
    deferred.resolve(conf);
  });

  function onErr(err) {
    console.log(err);
    return 1;
  }
  return deferred.promise;
}
var MyStream = require('json2csv-stream');
function createCsv(data,mode,path){
  console.log('creating the report...')
  var deferred = Q.defer();
  //var json2csv = require('json2csv');
  //var fields=[];
  //for(var prop in data[0]){
  //  fields.push(prop);
  //}
  //json2csv({ data: data, fields: fields }, function(err, csv) {
  //  if (err) {
  //    deferred.reject(err);
  //    throw err
  //  }
  //  else{
  //    console.log(csv);
  //    writeToFile('./report.csv',csv)
  //      .then(function(){
  //        deferred.resolve();
  //      },function(err){
  //        throw err;
  //        deferred.reject(err);
  //      });
  //  }
  //});
  //return deferred.promise;
  var counter=0;
  var wstream = fs.createWriteStream(path,{flags: mode});
  async.whilst(function () {
      return 0 < data.length && counter<80000
    },
    function (next) {
      if(counter==0){
        var headers='';
        for(var prop in data[0]){
            headers+=prop+',';
          }
        wstream.write(headers+'\n');
        var dataToWrite=data.splice(0,100);
        counter+=100;
        dataToWrite.forEach(function(el){
          for(var prop in el){
            if(typeof(el[prop])=="object") wstream.write(JSON.stringify(el[prop])+',');
            else wstream.write(el[prop]+',');
          }
          wstream.write(el[prop]+'\n');
        });
        next();
      }
      else{
        var dataToWrite=data.splice(0,100);
        counter+=100;
        dataToWrite.forEach(function(el,idx){
          for(var prop in el){
            if(typeof(el[prop])=="object") wstream.write(JSON.stringify(el[prop])+',');
            else wstream.write(el[prop]+',');
          }
          wstream.write(el[prop]+'\n');
        });
        next();
      }


    },
    function (err) {
      // All things are done!
      if(0 < data.length && counter>=80000){
        wstream.end(function(){
          return createCsv(data,'a',path)
        });
      }
      else wstream.end(function(){
        console.log('report created')
        deferred.resolve();
      });
    });


  return deferred.promise;
}

exports.createCsv = function (data,mode,path) {
  return createCsv(data,mode,path);
}
exports.RequestOptions = function (url, method, body,xsrf) {
  return RequestOptions(url, method, body,xsrf);
}

function writeToFile(filePath,data){
  var deferred = Q.defer();
  fs.writeFile(filePath, data, function (err) {
    if (err){
      deferred.reject(err);
      throw err;
    }
    else{
      console.log('csv file saved');
      deferred.resolve();
    }

  });
  return deferred.promise;
}

exports.writeToFile = function (filePath,data) {
  return writeToFile(filePath,data);
}

var dome9connection = require('./services/dome9-connection.js');
var cloudInstance = require('./services/instances.js');
var cloudSecurityGroups = require('./services/cloudSecurityGroups.js');
function selector(type,conf){
  var deferred = Q.defer();
  dome9connection = new dome9connection(conf.username, conf.password, conf._APIKey);
  cloudInstance = new cloudInstance(dome9connection);
  cloudSecurityGroups = new cloudSecurityGroups(dome9connection);

  switch(type){
    case 'instances':
      Q.all([cloudInstance.get(), cloudSecurityGroups.get()])
        .then(function (data) {

          deferred.resolve(cloudInstance.logic({instances: data[0], securityGroups: data[1]}));
        }, function (err) {
          console.error(err);
          deferred.reject(err);
        });
      break;

    default:
      Q.all([cloudInstance.get(), cloudSecurityGroups.get()])
        .then(function (data) {
          deferred.resolve(cloudInstance.logic({instances: data[0], securityGroups: data[1]}));
        }, function (err) {
          console.error(err);
          deferred.reject(err);
        });
      break;
  }

  return deferred.promise;
}

exports.selector = function (type,conf) {
  return selector(type,conf);
}