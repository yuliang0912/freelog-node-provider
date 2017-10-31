
'use strict'

/**
 * 本地开发配置.会与config.default进行合并
 * @param appInfo
 * @returns {{middleware: [string]}}
 */

module.exports = appInfo => {
    return {
        middleware: ['errorHandler'],
    }
}