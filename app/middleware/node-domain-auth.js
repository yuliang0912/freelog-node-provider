/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

/**
 * node 主域名检查中间件
 * @param app
 */
module.exports = (app) => async (ctx, next) => {
    if (!/^\/node\/([a-zA-Z0-9-]{4,24}[\/]?)$/.test(ctx.request.path)) {
        ctx.error({msg: "url地址错误,nodeDomain不正确"})
    }

    let urlPaths = ctx.request.path.split('/').filter(item => item.length > 0)

    let nodeDomain = urlPaths[1]

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