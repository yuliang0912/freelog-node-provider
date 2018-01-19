/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

/**
 * node 主域名检查中间件
 * @param app
 */
module.exports = (app) => async (ctx, next) => {

    let nodeDomain = ctx.checkParams('nodeDomain').isNodeDomain().value

    ctx.validate(false)

    let nodeInfo = await ctx.app.dataProvider.nodeProvider.getNodeInfo({nodeDomain})

    if (!nodeInfo) {
        ctx.error({msg: "nodeDomain is error"})
    }
    if (nodeInfo.status === 2) {
        ctx.error({msg: "节点已经被系统冻结访问"})
    }

    ctx.request.nodeInfo = nodeInfo

    /**
     * 校验nodeInfo
     * @returns {*}
     */
    ctx.validateNodeInfo = () => {
        if (nodeInfo) {
            return ctx
        }
        ctx.error({msg: '未找到node信息'})
    }

    await next()
}