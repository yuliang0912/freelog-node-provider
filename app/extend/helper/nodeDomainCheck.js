/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const systemRetain = ['freelog', 'node', 'nodes', 'admin']

module.exports = {

    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     */
    checkNodeDomain(nodeDomain) {
        nodeDomain = nodeDomain.trim()

        if (nodeDomain.length < 4 || nodeDomain.length > 24) {
            return "节点域名长度必须在4-24个之间"
        }

        if (!/^[a-zA-Z0-9-]{4,24}$/.test(nodeDomain)) {
            return "节点域名只能由英文字母,数字和 \"-\" 组成"
        }

        if (nodeDomain.endsWith('-')) {
            return "节点域名不能以\"-\"结尾"
        }

        if (systemRetain.some(item => item.toLocaleLowerCase() === nodeDomain.toLocaleLowerCase())) {
            return "节点域名不能注册系统保留字段"
        }

        return true
    },

    /**
     * 获取系统保留字段
     * @returns {[string,string]}
     */
    get systemRetain() {
        return systemRetain
    }
}