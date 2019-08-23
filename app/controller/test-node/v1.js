/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */

'use strict'

const Controller = require('egg').Controller;
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const {LoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class TestNodeController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
    }

    async index(ctx) {

    }
}