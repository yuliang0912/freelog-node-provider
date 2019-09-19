'use strict';

// npm run dev DO NOT read this file

global.Promise = require('bluebird')

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7005,
    workers: 1
});

//
// const nmrTranslator = require('@freelog/nmr_translator');
//
// const {errors, rules} = nmrTranslator.compile(`
//    + new_presentation_name_1 => #:yuliang/readme2
//    + new_presentation_name_2 => $:yuliang/发行B@^0.2.0
//    - new_presentation_name_1
//    & new_presentation_name_1 tags=[reset]
//    * $:yuliang/单一资源D => $:yuliang/单一资源E@0.1.0
// `)
//
// console.log(JSON.stringify(rules))
