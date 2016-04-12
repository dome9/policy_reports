/**
 * Created by arik.blumin on 4/6/2016.
 */
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
  var AtomicRule = function (sgName, sgId, protocol, port, scope, direction, sgDescription, instancesCount) {
    this.sgName = sgName;
    this.sgId = sgId;
    this.protocol = protocol;
    this.port = (protocol === 'ICMP' && port === 256) ? 'All' : port;
    this.direction = direction;

    this.instancesCount = instancesCount;
    /*  if (instances) {
     this.instances = instances;
     this.instancesCount = this.instances.length;
     }*/
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

  obj.runReport = function () {
    obj.loading = true;
    obj.alldata = [];

    obj.instancesSGMap = {};
    _.each(data.instances, function (instance) {
      _.each(instance.securityGroupIds, function (sgID) {
        if (obj.instancesSGMap[sgID]) {
          obj.instancesSGMap[sgID].push({"instanceName": instance.name, "ID": instance.id});
        }
        else {
          obj.instancesSGMap[sgID] = [];
          obj.instancesSGMap[sgID].push({"instanceName": instance.name, "ID": instance.id});
        }
      });
    });

    obj.listOfValues = {};

    // Transform the data from standard SG representation into a list of AtomicRule
    _.each(data.sgs, function (sg) {
      _.each(sg.services.inbound, function (service) {
        _.each(service.scope, function (scopeItem) {
          var instances = [];
          if (obj.instancesSGMap[sg.securityGroupId]) {
            instances = obj.instancesSGMap[sg.securityGroupId];
          }
          var instancesCount = instances.length;
          var ruleToAdd = new AtomicRule(
            sg.securityGroupName,
            sg.securityGroupId,
            service.protocolType,
            service.port,
            scopeItem,
            "Inbound", sg.securityGroupDescription, instancesCount);
          if (ruleToAdd) {
            obj.alldata.push(ruleToAdd);
          }

        });
      });
      _.each(sg.services.outbound, function (service) {
        _.each(service.scope, function (scopeItem) {
          var instances = [];
          if (obj.instancesSGMap[sg.id]) {
            instances = obj.instancesSGMap[sg.id];
          }
          var instancesCount = instances.length;
          var ruleToAdd = new AtomicRule(
            sg.securityGroupName,
            sg.securityGroupId,
            service.protocolType,
            service.port,
            scopeItem,
            "Outbound", sg.securityGroupDescription, instancesCount);

          if (ruleToAdd) {
            obj.alldata.push(ruleToAdd);
          }

        });
      });
    });

    obj.loading = false;
  };

  obj.fieldsToAutoCompleate = ["instancesCount", "account_id", "account", "region", "vpc", "sgName", "sgId", "xId", "protocol", "port", "direction", "type", "source"];

  obj.runReport();
  return obj.alldata;
}

function get(id) {
  var url = "https://secure.dome9.com/api/SecurityGroup";
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
    throw 'cannot perform dome9/SecurityGroup.get, reason:' + JSON.stringify(reason);
  });
}

function SecurityGroup(dome9Connection) {
  this.connection = dome9Connection;
}

SecurityGroup.prototype = {
  get: get,
  logic:logic
};

module.exports = function (dome9Connection) {
  return new SecurityGroup(dome9Connection);
};



