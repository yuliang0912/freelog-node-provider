'use strict';

// npm run dev DO NOT read this file

global.Promise = require('bluebird')

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7005,
    workers: 1
});

// const nmrTranslator = require('@freelog/nmr_translator');
//
// const testRuleText = `+ 1234567813244234234 => #:12345678/13244234234`
//
// const {errors, rules} = nmrTranslator.compile(testRuleText)
//
// console.log(JSON.stringify(errors),JSON.stringify(rules))
