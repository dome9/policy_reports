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

function logic(data){
  var AtomicRule = function (SGRule,
                             instanceId,
                             name,
                             cloudAccountId,
                             isRunning,
                             instanceType,
                             publicDnsName,
                             publicIpAddress,
                             tags,
                             privateIpAddress,
                             privateDnsName,
                             nicName) {
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
    this.instanceId = instanceId;
    this.name = name;
    this.cloudAccountId = cloudAccountId;
    this.state = "";
    if (isRunning) {
      this.state = "Running";
    }
    else {
      this.state = "Stopped";
    }
    ;
    this.instanceType = instanceType;
    this.publicDnsName = publicDnsName;
    this.publicIpAddress = publicIpAddress;
    this.tags = tags;
    this.privateIpAddress = privateIpAddress;
    this.privateDnsName = privateDnsName;
    this.nicName = nicName;
    this.type = SGRule.type;
    this.source = SGRule.source;
    this.scopeDescription = SGRule.scopeDescription;
    this.atomic_rule_id = '';

    if (this.publicIpAddress === '') {
      this.hasPublicAddress = 'No';
    }
    else {
      this.hasPublicAddress = 'Yes';
    }

    if (instanceId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + instanceId.toString() + '-';
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
  var obj={};
  // need to do some magic....
  obj['sgalldata'] = _.flattenDeep(_.map(data.securityGroups, function (sg) {
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
  obj['instancesSGMap'] = {};
  _.each(obj['sgalldata'], function (sgRule) {
    if (obj.instancesSGMap[sgRule.xId]) {
      obj.instancesSGMap[sgRule.xId].push(sgRule);
    }
    else {
      obj.instancesSGMap[sgRule.xId] = [];
      obj.instancesSGMap[sgRule.xId].push(sgRule);
    }
  });
  obj['listOfValues'] = {};
  obj['alldata'] = [];
  if (data.instances) {
    _.each(data.instances, function (instance) {
      _.each(instance.nics, function (nic) {
        _.each(nic.securityGroupIds, function (sgID) {
          var instanceSGs = obj.instancesSGMap[sgID];
          _.each(instanceSGs, function (sgRule) {
            var ruleToAdd = new AtomicRule(sgRule,
              instance.externalId,
              instance.name,
              instance.cloudAccountId,
              instance.isRunning,
              instance.instanceType,
              instance.publicDnsName,
              nic.publicIpAddress,
              instance.tags,
              nic.privateIpAddress,
              nic.privateDnsName,
              nic.nicName);
            obj.alldata.push(ruleToAdd);
          });
        });
      });
    });
  }
  return obj.alldata;
}


function get(id){
  var url = "https://secure.dome9.com/api/CloudInstance";
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
    throw 'cannot perform dome9/cloudInstance.get, reason:' + JSON.stringify(reason);
  });
}

function CloudInstance(dome9Connection){
  this.connection = dome9Connection;
}

CloudInstance.prototype = {
  get: get,
  logic:logic
};

module.exports = function(dome9Connection){
  return new CloudInstance(dome9Connection);
};
