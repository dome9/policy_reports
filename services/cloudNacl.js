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
  var AtomicRule = function (externalId,
                             name,
                             accountId,
                             vpcId,
                             region,
                             cloudAccountId,
                             naclId,
                             isDefault,
                             protocol,
                             ruleNumber,
                             ruleAction,
                             egress,
                             cidrBlock,
                             portRange,
                             icmpTypeCode, tags) {
    var protocolMap = {
      '-1': "All Traffic",
      '1': "ICMP",
      '17': "UDP",
      '6': "TCP",

    };
    this.externalId = externalId;
    this.name = name;
    this.accountId = accountId;
    this.vpcId = vpcId;
    this.region = D9.Constants.RegionName[region];
    this.cloudAccountId = cloudAccountId;
    this.naclId = naclId;
    this.isDefault = isDefault;
    this.protocol = protocolMap[protocol];
    this.ruleNumber = ruleNumber;
    this.ruleAction = ruleAction;
    if (egress == true) {
      this.egress = "Inbound";
    } else if (egress === false) {
      this.egress = "Outbound";
    }
    this.cidrBlock = cidrBlock;
    if (portRange !== undefined && portRange !== null) {
      this.portRange = portRange.from.toString() + '-' + portRange.to.toString();
    }
    this.icmpTypeCode = icmpTypeCode;
    this.tags = tags;

    this.atomic_rule_id = this.naclId;

    if (protocol !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.protocol.toString() + '-';
    }
    if (portRange !== undefined && portRange !== null) {
      this.atomic_rule_id = this.atomic_rule_id + portRange.from.toString() + '-' + portRange.to.toString() + '-';
    }
    if (this.cidrBlock !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.cidrBlock.toString() + '-';
    }

  }

  obj.runReport = function () {
    obj.loading = true;
    obj.alldata = [];

    obj.alldata = [];
    obj.listOfValues = {};

    obj.cloudaccountsMap = {};
    _.each(data.cloudaccounts, function (cloud) {
      var key = "Guid_" + cloud.id;
      obj.cloudaccountsMap[key] = {name: cloud.name};
    });

    obj.vpcsInfoMap = {};
    _.each(data.vpcsInfo, function (vpcinfo) {
      obj.vpcsInfoMap[vpcinfo.externalId] = {name: vpcinfo.name};
    });

    // Transform the data from standard SG representation into a list of AtomicRule
    if (data.nacls) {
      _.each(data.nacls, function (nacl) {
        _.each(nacl.entries, function (entry) {
          var vpcname = "";
          if (obj.vpcsInfoMap[nacl.vpcId] && obj.vpcsInfoMap[nacl.vpcId].name !== "") {
            vpcname = obj.vpcsInfoMap[nacl.vpcId].name + " (" + nacl.vpcId + ")";
          } else {
            vpcname = nacl.vpcId;
          }

          var cloudAccountName = "";
          var key = "Guid_" + nacl.cloudAccountId;
          if (obj.cloudaccountsMap[key] && obj.cloudaccountsMap[key].name !== "") {
            cloudAccountName = obj.cloudaccountsMap[key].name;
          } else {
            cloudAccountName = nacl.cloudAccountId;
          }

          var ruleToAdd = new AtomicRule(nacl.externalId,
            nacl.name,
            nacl.accountId,
            vpcname,
            nacl.region,
            cloudAccountName,
            nacl.naclId,
            nacl.isDefault,
            entry.protocol,
            entry.ruleNumber,
            entry.ruleAction,
            entry.egress,
            entry.cidrBlock,
            entry.portRange,
            entry.icmpTypeCode,
            nacl.tags);
          obj.alldata.push(ruleToAdd);
        });
      });
    }

    obj.loading = false;


  };

  obj.fieldsToAutoCompleate = [
    "vpcId",
    "region",
    "cloudAccountId",
    "protocol",
    "ruleAction",
    "egress",
    "cidrBlock",
    "portRange",
  ];

  obj.runReport();
  return obj.alldata;
}

function get(id) {
  var url = "https://secure.dome9.com/api/CloudNacl";
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
    throw 'cannot perform dome9/CloudNacl.get, reason:' + JSON.stringify(reason);
  });
}

function CloudNacl(dome9Connection) {
  this.connection = dome9Connection;
}

CloudNacl.prototype = {
  get: get,
  logic: logic
};

module.exports = function (dome9Connection) {
  return new CloudNacl(dome9Connection);
};

