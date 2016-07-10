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
    var AtomicRule = function (account, account_id, regionId, vpc, sgName, sgId, sgExternalId, protocol, port, scope, direction, tags, instancesCount, elbsCount, rdsCount) {
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
        //this.tags2 = JSON.stringify(this.tags);
        this.type = scope.type;
        //this.instances = [];
        this.instancesCount = instancesCount;
        this.elbsCount = elbsCount;
        this.rdsCount = rdsCount;
        /*  if (instances) {
         this.instances = instances;
         this.instancesCount = this.instances.length;
         }*/

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
                this.source = scope.data.name;
                this.scopeDescription = "";
                break;
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

    }


    obj.runReport = function () {
        obj.loading = true; //check
        obj.alldata = [];

        obj.instancesSGMap = {};
        _.each(data.instances, function (instance) {
            _.each(instance.nics, function (nic) {
                _.each(nic.securityGroupIds, function (sgID) {
                    if (obj.instancesSGMap[sgID]) {
                        obj.instancesSGMap[sgID].push({
                            "instanceName": instance.name,
                            "InstanceID": instance.instanceId
                        });
                    }
                    else {
                        obj.instancesSGMap[sgID] = [];
                        obj.instancesSGMap[sgID].push({
                            "instanceName": instance.name,
                            "InstanceID": instance.instanceId
                        });
                    }
                });
            });
        });

        obj.elbsSGMap = {};
        _.each(data.elbs, function (elb) {
            _.each(elb.securityGroups, function (sgID) {
                if (obj.elbsSGMap[sgID]) {
                    obj.elbsSGMap[sgID].push({"elbName": elb.name, "elbId": elb.elbId});
                }
                else {
                    obj.elbsSGMap[sgID] = [];
                    obj.elbsSGMap[sgID].push({"elbName": elb.name, "elbId": elb.elbId});
                }
            });
        });

        obj.rdsSGMap = {};
        _.each(data.rdsData, function (rds) {
            _.each(rds.securityGroups, function (sgID) {
                if (obj.rdsSGMap[sgID]) {
                    obj.rdsSGMap[sgID].push({"rdsName": rds.name, "rdsId": rds.externalId});
                }
                else {
                    obj.rdsSGMap[sgID] = [];
                    obj.rdsSGMap[sgID].push({"rdsName": rds.name, "rdsId": rds.externalId});
                }
            });
        });

        obj.listOfValues = {};
        // Transform the data from standard SG representation into a list of AtomicRule
        obj.alldata = _.flattenDeep(_.map(data.securityGroups, function (sg) {
            var inboundRules = _.map(sg.services.inbound, function (service) {
                return _.map(service.scope, function (scopeItem) {
                    var instances = [];
                    if (obj.instancesSGMap[sg.externalId]) {
                        instances = obj.instancesSGMap[sg.externalId];
                    }
                    var instancesCount = instances.length;

                    var elbs = [];
                    if (obj.elbsSGMap[sg.externalId]) {
                        elbs = obj.elbsSGMap[sg.externalId];
                    }
                    var elbsCount = elbs.length;

                    var rds = [];
                    if (obj.rdsSGMap[sg.externalId]) {
                        rds = obj.rdsSGMap[sg.externalId];
                    }
                    var rdsCount = rds.length;

                    var ruleToAdd = new AtomicRule(
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
                        "Inbound", sg.tags, instancesCount, elbsCount,rdsCount);

                    return ruleToAdd;

                });
            });
            var outboundRules = _.map(sg.services.outbound, function (service) {
                return _.map(service.scope, function (scopeItem) {
                    var instances = [];
                    if (obj.instancesSGMap[sg.externalId]) {
                        instances = obj.instancesSGMap[sg.externalId];
                    }
                    var instancesCount = instances.length;

                    var elbs = [];
                    if (obj.elbsSGMap[sg.externalId]) {
                        elbs = obj.elbsSGMap[sg.externalId];
                    }
                    var elbsCount = elbs.length;

                    var rds = [];
                    if (obj.rdsSGMap[sg.externalId]) {
                        rds = obj.rdsSGMap[sg.externalId];
                    }
                    var rdsCount = rds.length;

                    var ruleToAdd = new AtomicRule(
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
                        "Outbound", sg.tags, instancesCount, elbsCount, rdsCount);

                    return ruleToAdd;
                });
            });
            return inboundRules.concat(outboundRules);
        }));

        obj.loading = false;


    };

    obj.fieldsToAutoCompleate = ["rdsCount","elbsCount", "instancesCount", "account_id", "account", "region", "vpc", "sgName", "sgId", "xId", "protocol", "port", "direction", "type", "source"];

    obj.runReport();
    return obj.alldata;

}

function get(id) {
    var url = "https://secure.dome9.com/api/cloudsecuritygroup";
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
        throw 'cannot perform dome9/aws-security-group.get, reason:' + JSON.stringify(reason);
    });
}

function SecurityGroup(dome9Connection) {
    this.connection = dome9Connection;
}

SecurityGroup.prototype = {
    get: get,
    logic: logic
};

module.exports = function (dome9Connection) {
    return new SecurityGroup(dome9Connection);
};