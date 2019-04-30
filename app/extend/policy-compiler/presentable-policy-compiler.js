'use strict'

const freelogResourcePolicyLang = require('@freelog/resource-policy-lang')

module.exports = class FreelogPresentablePolicyCompiler {

    /**
     * @param policyText
     * @param policyName
     */
    compiler(ctx, {policyText, policyName}) {

        const {authorizedObjects, state_machine, errors, policy_text} = freelogResourcePolicyLang.compile(policyText)

        if (errors.length) {
            throw new Error(ctx.gettext('授权方案策略编译失败%s', errors.toString()))
        }

        return {
            segmentId: '', policyName,
            status: 1, //默认可用
            authorizedObjects,
            policyText: policy_text,
            fsmDeclarations: state_machine.declarations,
            fsmStates: state_machine.states,
        }
    }
}
