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

  var SGRule = function (sgName, sgId, protocol, port, scope, direction, sgDescription) {
    this.sgName = sgName;
    this.sgId = sgId;
    this.protocol = protocol;
    this.port = (protocol === 'ICMP' && port === 256) ? 'All' : port;
    this.direction = direction;
    this.description = sgDescription;

    if (scope && scope.type) {
      this.type = scope.type;
      //this.instances = [];

      switch (scope.type) {
        case "AWS":
          this.source = scope.data.extid;
          this.scopeDescription = scope.data.name;
          break;
        case "DNS":
          this.source = scope.data.dns;
          this.scopeDescription = scope.data.note;
          break;
        case "CIDR":
          this.source = scope.data.cidr;
          this.scopeDescription = scope.data.note;
          break;
        case "IPList":
          this.source = scope.data.name;
          this.scopeDescription = "";
          break;
        case "MagicIP":
          this.source = scope.data.name;
          this.scopeDescription = "";
          break;
      }
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

  }

  var AtomicRule = function (SGRule,
                             id,
                             name) {
    this.name = name;
    this.id = id;
    this.sgName = SGRule.sgName;
    this.sgId = SGRule.sgId;
    this.protocol = SGRule.protocol;
    this.port = SGRule.port;
    this.direction = SGRule.direction;

    this.description = SGRule.sgDescription;

    this.source = SGRule.source;
    this.scopeDescription = SGRule.scopeDescription;
    this.atomic_rule_id = '';

    if (id !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + id.toString() + '-';
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
  }

  obj.runReport = function () {
    obj.loading = true;
    obj.alldata = [];
    obj.indexdata = {};

    obj.sgalldata = [];
    _.each(data.sgs, function (sg) {
      _.each(sg.services.inbound, function (service) {
        _.each(service.scope, function (scopeItem) {
          var ruleToAdd = new SGRule(
            sg.securityGroupName,
            sg.securityGroupId,
            service.protocolType,
            service.port,
            scopeItem,
            "Inbound", sg.securityGroupDescription);
          if (ruleToAdd) {
            obj.sgalldata.push(ruleToAdd);
          }

        });
      });
      _.each(sg.services.outbound, function (service) {
        _.each(service.scope, function (scopeItem) {
          var ruleToAdd = new SGRule(
            sg.securityGroupName,
            sg.securityGroupId,
            service.protocolType,
            service.port,
            scopeItem,
            "Outbound", sg.securityGroupDescription);
          if (ruleToAdd) {
            obj.sgalldata.push(ruleToAdd);
          }

        });
      });
    });

    obj.instancesSGMap = {};
    _.each(obj.sgalldata, function (sgRule) {
      if (obj.instancesSGMap[sgRule.sgId]) {
        obj.instancesSGMap[sgRule.sgId].push(sgRule);
      }
      else {
        obj.instancesSGMap[sgRule.sgId] = [];
        obj.instancesSGMap[sgRule.sgId].push(sgRule);
      }
    });
    obj.listOfValues = {};
    obj.alldata = [];
    if (data.instances) {
      _.each(data.instances, function (instance) {
        _.each(instance.securityGroupIds, function (sgID) {
          var instanceSGs = obj.instancesSGMap[sgID];
          _.each(instanceSGs, function (sgRule) {
            var ruleToAdd = new AtomicRule(sgRule,
              instance.id,
              instance.name
            );
            obj.alldata.push(ruleToAdd);
          });
        });
      });
    }
    obj.loading = false;

  };

  obj.fieldsToAutoCompleate = ["source", "sgName", "sgId", "protocol", "port", "direction",];

  obj.runReport();
  return obj.alldata
}

function get(id) {
  var url = "https://secure.dome9.com/api/Agent";
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
    throw 'cannot perform dome9/Agent.get, reason:' + JSON.stringify(reason);
  });
}

function Agent(dome9Connection) {
  this.connection = dome9Connection;
}

Agent.prototype = {
  get: get,
  logic:logic
};

module.exports = function (dome9Connection) {
  return new Agent(dome9Connection);
};


