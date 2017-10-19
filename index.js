'use strict';

// npm run dev DO NOT read this file

global.Promise = require('bluebird')

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7005, // default to 7001
    workers: 2
});

