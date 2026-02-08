/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "businessunits": {
    "tableId": "",
    "version": "",
    "primaryKey": "businessunitid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "fieldpermissions": {
    "tableId": "",
    "version": "",
    "primaryKey": "fieldpermissionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "fieldsecurityprofiles": {
    "tableId": "",
    "version": "",
    "primaryKey": "fieldsecurityprofileid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "principalobjectattributeaccessset": {
    "tableId": "",
    "version": "",
    "primaryKey": "principalobjectattributeaccessid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "principalobjectaccessset": {
    "tableId": "",
    "version": "",
    "primaryKey": "principalobjectaccessid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "privileges": {
    "tableId": "",
    "version": "",
    "primaryKey": "privilegeid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "roleprivilegescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "roleprivilegeid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "roles": {
    "tableId": "",
    "version": "",
    "primaryKey": "roleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "ope_simplesecurityactions": {
    "tableId": "",
    "version": "",
    "primaryKey": "ope_simplesecurityactionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemuserprofilescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserprofileid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemuserrolescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserroleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teammemberships": {
    "tableId": "",
    "version": "",
    "primaryKey": "teammembershipid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teamprofilescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamprofileid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teamrolescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamroleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teams": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teamtemplates": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamtemplateid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemusers": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "simplesecurityaction_5f9502eaa715bb753a_5fe3bd4ed65c4ae136": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "SimpleSecurityAction": {
        "path": "/{connectionId}/api/data/v9.2/ope_simplesecurityaction",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "object"
          }
        }
      }
    }
  }
};
