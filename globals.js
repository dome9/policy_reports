/**
 * Created by arik.blumin on 4/6/2016.
 */
/**
 * Created by Moshi on 2/28/2016.
 */
var _ = require('lodash');
var winston = require('winston');


var accountId;


var proxy = process.env.http_proxy ? process.env.http_proxy : undefined;
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

module.exports = {
  dome9AuthenticationCookies: null,
  accountId:accountId,
  logger: new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({stderrLevels:['error', 'debug', 'info', 'warn'], level: 'debug'}) // in this CLI tool - we'll write all logs to STDERR except the resutl of the tool.
    ]
  }),
  RequestOptions:RequestOptions
};