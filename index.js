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
// const testRuleText = `
//  + new_presentation_name_1 => $:yanghongtian/FreelogText@0.1.0
//  * $:ww-zh/音乐专辑-Test => #:1234/json07`
//
// const {errors, rules} = nmrTranslator.compile(testRuleText)
//
// console.log(JSON.stringify(errors))
