'use strict'

module.exports = {

    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     */
    checkNodeDomain(ctx, nodeDomain) {

        const result = {ret: true, msg: ''}
        if (this.systemRetain.some(item => item.toLocaleLowerCase() === nodeDomain.toLocaleLowerCase())) {
            result.ret = false
            result.msg = ctx.gettext('节点域名不能注册系统保留字段')
        }
        
        return result
    },

    /**
     * 获取系统保留字段
     * @returns {[string,string]}
     */
    get systemRetain() {
        return ['freelog', 'free', 'democracy', 'service', 'node', 'nodes', 'admin', 'self', 'public', 'system', 'user', 'group', 'copyright', 'platform', 'china', 'xijinping', 'company', 'maozedong', 'dengxiaop', 'zhouenlai', 'likeqiang', 'jiangzeming', 'hujingtao']
    }
}