'use strict';

// npm run dev DO NOT read this file

global.Promise = require('bluebird')

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7005,
    workers: 1
});


// + new_presentation_name_1 => #:yuliang/readme2
// + new_presentation_name_2 => $:yuliang/发行B@^0.2.0
//- new_presentation_name_1

//& new_presentation_name_1 tags=[reset]
// * $:yuliang/单一资源D => $:yuliang/单一资源E@0.1.0 scope = [my-presentable -> $:yuliang/发行B]
// ^ my-presentable1


// const nmrTranslator = require('@freelog/nmr_translator');
//

// const nmrTranslator = require('@freelog/nmr_translator')
//
// var testRuleText =`add $freelog/iconfont[]@0.1.0 as iconfont[]_h1ks
//                  do end`
//
// const {errors, rules} = nmrTranslator.compile(testRuleText)
//
// console.log(JSON.stringify(errors),JSON.stringify(rules))


//
// const testRuleText = `+ new_presentation_name_1 => $:yanghongtian/FreelogText@0.1.0
// * $:ww-zh/音乐专辑-Test => #:1234/json07`
//
// const {errors, rules} = nmrTranslator.compile(testRuleText)
//
// console.log(JSON.stringify(errors),JSON.stringify(rules))
