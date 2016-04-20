/**
 * Created by arik.blumin on 4/6/2016.
 */

var utils = require('./../utils.js');
var Q = require('q');
var globals = require('./../globals');
var logger = globals.logger;
var _ = require('lodash');
var constants = require('./../constants.js');
var D9 = constants.D9;

function logic(data) {

  var obj = {};
  obj.alldata = [];
  obj.groups = [];
  obj.loading = false;

  var AtomicRule = function (SGRule,
                             rdsId,
                             name,
                             cloudAccountId,
                             tags, instanceType, isPublicAccessible, status, endpoint, dbType) {
    this.account = SGRule.account;
    this.account_id = SGRule.account_id;
    this.regionId = SGRule.regionId;
    this.region = D9.Constants.RegionName[this.regionId];
    this.vpc = SGRule.vpc;
    this.sgName = SGRule.sgName;
    this.sgId = SGRule.sgId;
    this.xId = SGRule.xId;
    this.protocol = SGRule.protocol;
    this.port = SGRule.port;
    this.direction = SGRule.direction;
    this.SGtags = SGRule.tags;
    this.rdsId = rdsId;
    this.instanceType = instanceType;
    this.name = name;
    this.cloudAccountId = cloudAccountId;
    this.tags = tags;
    this.type = SGRule.type;
    this.source = SGRule.source;
    this.scopeDescription = SGRule.scopeDescription;
    this.atomic_rule_id = '';
    this.status = status;
    this.endpoint = endpoint.address + ":" + endpoint.port;
    this.dbType = dbType;

    if (isPublicAccessible === false) {
      this.isPublicAccessible = 'No';
    }
    else {
      this.isPublicAccessible = 'Yes';
    }

    if (rdsId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + rdsId.toString() + '-';
    }
    if (SGRule.sgId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.sgId.toString() + '-';
    }
    if (SGRule.protocol !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.protocol.toString() + '-';
    }
    if (SGRule.port !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.port.toString() + '-';
    }
    if (this.source !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.source.toString() + '-';
    }
  };

  var SGRule = function (account, account_id, regionId, vpc, sgName, sgId, sgExternalId, protocol, port, scope, direction, tags) {
    this.account = account;
    this.account_id = account_id;
    this.regionId = regionId;
    this.region = D9.Constants.RegionName[this.regionId];
    this.vpc = vpc;
    this.sgName = sgName;
    this.sgId = sgId;
    this.xId = sgExternalId;
    this.protocol = protocol;
    this.port = (protocol === 'ICMP' && port === 256) ? 'All' : port;
    this.direction = direction;
    this.tags = tags;
    this.type = scope.type;

    switch (scope.type) {
      case "AWS":
        this.source = scope.data.extid;
        this.scopeDescription = scope.data.name;
        break;
      case "CIDR":
        this.source = scope.data.cidr;
        this.scopeDescription = scope.data.note;
        break;
      case "IPList":
      case "MagicIP":
        this.source = scope.data.name;
        this.scopeDescription = "";
        break;

    }

    this.atomic_rule_id = '';

    if (sgId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + sgId.toString() + '-';
    }
    if (protocol !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + protocol.toString() + '-';
    }
    if (port !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + port.toString() + '-';
    }
    if (this.source !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.source.toString() + '-';
    }

  };

  obj.runReport = function () {
    obj.loading = true;
    obj.alldata = [];
    obj.indexdata = {};
    // need to do some magic....
    obj.sgalldata = _.flattenDeep(_.map(data.securityGroups, function (sg) {
      var inboundRules = _.map(sg.services.inbound, function (service) {
        return _.map(service.scope, function (scopeItem) {
          return new SGRule(
            sg.cloudAccountName,
            sg.cloudAccountId,
            sg.regionId,
            sg.vpcId,
            sg.securityGroupName,
            sg.securityGroupId,
            sg.externalId,
            service.protocolType,
            service.port,
            scopeItem,
            "Inbound", sg.tags);
        });
      });
      var outboundRules = _.map(sg.services.outbound, function (service) {
        return _.map(service.scope, function (scopeItem) {
          return new SGRule(
            sg.cloudAccountName,
            sg.cloudAccountId,
            sg.regionId,
            sg.vpcId,
            sg.securityGroupName,
            sg.securityGroupId,
            sg.externalId,
            service.protocolType,
            service.port,
            scopeItem,
            "Outbound", sg.tags);
        });
      });
      return inboundRules.concat(outboundRules);
    }));
    obj.rdsSGMap = {};
    _.each(obj.sgalldata, function (sgRule) {
      if (obj.rdsSGMap[sgRule.xId]) {
        obj.rdsSGMap[sgRule.xId].push(sgRule);
      }
      else {
        obj.rdsSGMap[sgRule.xId] = [];
        obj.rdsSGMap[sgRule.xId].push(sgRule);
      }
    });
    obj.listOfValues = {};
    obj.alldata = [];
    if (data.rds) {
      _.each(data.rds, function (rds) {
        _.each(rds.securityGroups, function (sgID) {
          var rdsSGs = obj.rdsSGMap[sgID];
          _.each(rdsSGs, function (sgRule) {
            var ruleToAdd = new AtomicRule(sgRule,
              rds.externalId,
              rds.name,
              rds.cloudAccountId,
              rds.tags, rds.instanceType, rds.isPublicAccessible, rds.status, rds.endpoint, rds.dbType);
            obj.alldata.push(ruleToAdd);
          });
        });
      });
    }
    obj.loading = false;

  };

  obj.fieldsToAutoCompleate = ["xId", "cloudAccountId", "type", "status", "source", "account", "account_id", "region", "vpc", "sgName", "sgId", "protocol", "port", "direction", "isPublicAccessible", "instanceType", "dbType"];

  obj.runReport();
  return obj.alldata;
}

function get(id) {
  var url = "https://secure.dome9.com/api/CloudDbInstance";
  if (id) {
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

  return Q(this.connection.requestV2WebApi(requestOptions)).fail(function (reason) {
    throw 'cannot perform dome9/CloudDbInstance.get, reason:' + JSON.stringify(reason);
  });
}

function CloudDbInstance(dome9Connection) {
  this.connection = dome9Connection;
}

CloudDbInstance.prototype = {
  get: get,
  logic: logic
};

module.exports = function (dome9Connection) {
  return new CloudDbInstance(dome9Connection);
};



