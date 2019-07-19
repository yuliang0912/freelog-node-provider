'use strict'

const lodash = require('lodash')

module.exports = class PresentableSignContractEventHandler {

    constructor(app) {
        this.app = app
        this.presentableProvider = app.dal.presentableProvider
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * 签约合同事件处理
     * @param args
     * @returns {Promise<void>}
     */
    async handle({presentableId, contracts}) {

        if (lodash.isEmpty(contracts)) {
            return
        }

        return this.signReleaseContractEventHandle(presentableId, contracts)
    }

    /**
     * presentable签约合同事件
     * @param presentableId
     * @param contracts
     * @returns {Promise<void>}
     */
    async signReleaseContractEventHandle(presentableId, contracts) {

        const contractMap = new Map(contracts.map(x => [`${x.partyOne}_${x.policyId}`, x]))
        const presentableInfo = await this.presentableProvider.findById(presentableId, 'resolveReleases')

        for (let i = 0, j = presentableInfo.resolveReleases.length; i < j; i++) {
            const resolveRelease = presentableInfo.resolveReleases[i]
            for (let x = 0; x < resolveRelease.contracts.length; x++) {
                let contract = resolveRelease.contracts[x]
                let signedContractInfo = contractMap.get(`${resolveRelease.releaseId}_${contract.policyId}`)
                if (signedContractInfo) {
                    contract.contractId = signedContractInfo.contractId
                }
            }
        }

        await presentableInfo.updateOne({resolveReleases: presentableInfo.resolveReleases}).catch(error => {
            console.log('合同ID赋值操作失败', error)
        })
    }
}