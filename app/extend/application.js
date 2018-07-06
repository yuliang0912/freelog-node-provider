/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'


const restfulWebApiKey = Symbol('app#restfulWebApiKey')
const restfulWebApi = require('./restful-web-api/index')

module.exports = {

    /**
     * restFul-api
     * @returns {*}
     */
    get webApi() {
        if (!this.__cacheMap__.has(restfulWebApiKey)) {
            this.__cacheMap__.set(restfulWebApiKey, new restfulWebApi(this.config))
        }
        return this.__cacheMap__.get(restfulWebApiKey)
    },
    
}