'use strict'

module.exports = {

    /**
     * presentable签约事件
     */
    signReleaseContractEvent: Symbol('node#signReleaseContractEvent'),

    /**
     * presentable对应的发行版本锁定事件
     */
    presentableVersionLockEvent: Symbol('node#presentableVersionLockEvent'),

    /**
     * 生成presentable依赖树事件(锁定版本)
     */
    generatePresentableDependencyTreeEvent: Symbol('node#generatePresentableDependencyTreeEvent'),

    /**
     * presentable上下线状态
     */
    presentableSwitchOnlineStateEvent: Symbol('node#presentableSwitchOnlineStateEvent'),

}