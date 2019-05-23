'use strict';

// npm run dev DO NOT read this file

global.Promise = require('bluebird')

const lodash = require('lodash')

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7005,
    workers: 1
});

var presentableInfos = [{
    "resolveReleases": [
        {
            "contracts": [
                {
                    "contractId": "5cce9f33ffbf3642dc291979",
                    "policyId": "8cefe2f1dcc6dd0bdaadac946cb63dbc"
                }
            ],
            "releaseId": "5cb039815a791845b4aed4ab",
            "releaseName": "b1"
        },
        {
            "contracts": [
                {
                    "contractId": "5cdd25e58b01222dac2620d6",
                    "policyId": "8cefe2f1dcc6dd0bdaadac946cb63dbc"
                }
            ],
            "releaseId": "5cc1271a204f822804244992",
            "releaseName": "a-a-b-6"
        }
    ]
}]

