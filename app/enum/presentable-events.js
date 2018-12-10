/**
 * presentable事件
 */

'use strict'

module.exports = {

    /**
     * 创建presentable事件
     */
    presentableOnlineOrOfflineEvent: Symbol('node#presentableOnlineOrOfflineEvent'),

    /**
     * 更新presentable事件
     */
    updatePresentableEvent: Symbol('node#updatePresentableEvent'),

    /**
     * presentable获得上线授权事件
     */
    presentableOnlineAuthEvent: Symbol('node#presentableOnlineAuthEvent'),
}