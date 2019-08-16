'use strict'

/**
 * 本地开发配置.会与config.default进行合并
 * @param appInfo
 * @returns {{middleware: [string]}}
 */

module.exports = {

    //gatewayUrl: 'http://api.testfreelog.com',

    //gatewayUrl: 'http://192.168.164.165:8895',

    middleware: ['errorHandler', 'localUserIdentity'],

    // mongoose: {
    //     url: "mongodb://172.18.215.231:27018/node"
    // },

    // mongoose: {
    //     url: "mongodb://119.23.45.143:27018/node"
    // },

    /**
     * 本地开发环境身份信息
     */
    localIdentity: {
        userId: 0, //50003,
        userName: "余亮",
        nickname: "烟雨落叶",
        email: "4896819@qq.com",
        mobile: "",
        tokenSn: "86cd7c43844140f2a4101b441537728f",
        userRol: 1,
        status: 1,
        createDate: "2017-10-20T16:38:17.000Z",
        updateDate: "2017-11-01T15:53:29.000Z",
        tokenType: "local"
    }
}