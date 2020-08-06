import {inject, provide} from 'midway';
import {
    CreatePresentableOptions,
    IOutsideApiService,
    IPresentableService,
    PolicyInfo,
    PresentableInfo,
    ResolveResource,
    ResourceInfo,
    UpdatePresentableOptions
} from '../../interface';
import {differenceBy, isArray, isEmpty, chain, pick, assign, uniqBy} from 'lodash';
import {ApplicationError} from 'egg-freelog-base';
import {PresentableAuthStatusEnum, PresentableOnlineStatusEnum, SubjectTypeEnum} from "../../enum";

@provide()
export class PresentableService implements IPresentableService {

    @inject()
    ctx;
    @inject()
    presentableProvider;
    @inject()
    presentableVersionService;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    async createPresentable(options: CreatePresentableOptions) {

        const {resourceInfo, resolveResources, nodeInfo, policies, presentableName, presentableTitle, version, versionId, tags, intro, coverImages} = options;

        const model = {
            presentableName, presentableTitle, version, tags, intro, coverImages, resolveResources,
            policies: [],
            nodeId: nodeInfo.nodeId,
            userId: nodeInfo.ownerUserId,
            resourceInfo: pick(options.resourceInfo, ['resourceId', 'resourceName', 'resourceType']),
            authStatus: PresentableAuthStatusEnum.Unknown,
            onlineStatus: PresentableOnlineStatusEnum.Offline
        };

        await this._validateResolveResources(resourceInfo, resolveResources);

        if (!isEmpty(policies)) {
            const policyIdNameMap: Map<string, string> = await this._validateSubjectPolicies(options.policies, SubjectTypeEnum.Resource).then(list => new Map(list.map(x => [x.policyId, x.policyName])));
            policies.forEach(addPolicy => model.policies.push({
                policyId: addPolicy.policyId,
                policyName: addPolicy.policyName ?? policyIdNameMap.get(addPolicy.policyId),
                status: addPolicy.status ?? 1
            }));
            if (model.policies.some(x => x.status === 1)) {
                model.onlineStatus = PresentableOnlineStatusEnum.Online;
            }
        }

        const beSignSubjects = chain(resolveResources).map(({resourceId, contracts}) => contracts.map(({policyId}) => Object({
            subjectId: resourceId, policyId
        }))).flattenDeep().value();

        // 批量签约,已签过的则直接返回对应的合约ID.合约需要作为创建展品的前置必要条件
        await this.outsideApiService.batchSignNodeContracts(nodeInfo.nodeId, beSignSubjects).then(contracts => {
            const contractMap = new Map<string, string>(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
            model.resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(resolveContractInfo => {
                resolveContractInfo.contractId = contractMap.get(resolveResource.resourceId + resolveContractInfo.policyId) ?? '';
            }));
        });

        const presentableInfo = await this.presentableProvider.create(model);

        this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, versionId).then();

        return presentableInfo;
    }

    /**
     * 更新展品
     * @param presentableInfo
     * @param options
     */
    async updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo> {
        const updateModel: any = {
            intro: options.intro ?? presentableInfo.intro,
            presentableTitle: options.presentableTitle ?? presentableInfo.presentableTitle
        };
        if (isArray(options.tags)) {
            updateModel.tags = options.tags;
        }

        const existingPolicyMap = new Map<string, PolicyInfo>(presentableInfo.policies.map(x => [x.policyId, x]));
        if (isArray(options.updatePolicies)) {
            options.updatePolicies.forEach(modifyPolicy => {
                const existingPolicy = existingPolicyMap.get(modifyPolicy.policyId);
                if (existingPolicy) {
                    existingPolicy.policyName = modifyPolicy.policyName ?? existingPolicy.policyName;
                    existingPolicy.status = modifyPolicy.status ?? existingPolicy.status;
                }
            });
        }
        if (isArray(options.addPolicies)) {
            const policyIdNameMap: Map<string, string> = await this._validateSubjectPolicies(options.addPolicies, SubjectTypeEnum.Resource).then(list => new Map(list.map(x => [x.policyId, x.policyName])));
            options.addPolicies.forEach(addPolicy => {
                if (existingPolicyMap.has(addPolicy.policyId)) {
                    throw new ApplicationError(this.ctx.gettext('policy-create-duplicate-error'), addPolicy);
                }
                addPolicy.policyName = addPolicy.policyName ?? policyIdNameMap.get(addPolicy.policyId);
                addPolicy.status = addPolicy.status ?? 1;
                existingPolicyMap.set(addPolicy.policyId, addPolicy);
            });
        }
        if (isArray(options.updatePolicies) || isArray(options.addPolicies)) {
            updateModel.policies = [...existingPolicyMap.values()];
            updateModel.onlineStatus = updateModel.policies.some(x => x.status === 1) ? PresentableOnlineStatusEnum.Online : PresentableOnlineStatusEnum.Offline;
        }

        // 如果重新选择已解决资源的策略,则系统会重新进行签约,并且赋值
        if (!isEmpty(options.resolveResources)) {
            const invalidResolveResources = differenceBy(options.resolveResources, presentableInfo.resolveResources, 'resourceId');
            if (invalidResolveResources.length) {
                throw new ApplicationError(this.ctx.gettext('presentable-update-resolve-release-invalid-error'), {invalidResolveResources});
            }
            const beSignSubjects = chain(options.resolveResources).map(({resourceId, contracts}) => contracts.map(({policyId}) => Object({
                subjectId: resourceId, policyId
            }))).flattenDeep().value();
            const contractMap = await this.outsideApiService.batchSignNodeContracts(presentableInfo.nodeId, beSignSubjects).then(contracts => {
                return new Map<string, string>(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
            });
            options.resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(item => {
                item.contractId = contractMap.get(resolveResource.resourceId + item.policyId) ?? '';
            }));
            updateModel.resolveResources = presentableInfo.resolveResources.map(resolveResource => {
                const modifyResolveResource = options.resolveResources.find(x => x.resourceId === resolveResource.resourceId);
                return modifyResolveResource ? assign(resolveResource, modifyResolveResource) : resolveResource;
            });
        }

        return this.presentableProvider.findOneAndUpdate({_id: presentableInfo.presentableId}, updateModel, {new: true});
    }

    async findOne(condition: object, ...args): Promise<PresentableInfo> {
        return this.presentableProvider.findOne(condition, ...args);
    }

    async findById(presentableId: string, ...args): Promise<PresentableInfo> {
        return this.presentableProvider.findById(presentableId, ...args);
    }

    async find(condition: object, ...args): Promise<PresentableInfo[]> {
        return this.presentableProvider.find(condition, ...args);
    }

    async findByIds(presentableIds: string[], ...args): Promise<PresentableInfo[]> {
        return this.presentableProvider.find({_id: {$in: presentableIds}}, ...args);
    }

    async findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PresentableInfo[]> {
        return this.presentableProvider.findPageList(condition, page, pageSize, projection.join(' '), orderBy);
    }

    async count(condition: object): Promise<number> {
        return this.presentableProvider.count(condition);
    }

    /**
     * 校验resolveResources参数
     * @param resourceInfo
     * @param resolveResources
     * @returns {Promise<void>}
     * @private
     */
    async _validateResolveResources(resourceInfo: ResourceInfo, resolveResources: ResolveResource[]) {

        const {ctx} = this;
        const allUntreatedResources = resourceInfo.baseUpcastResources.concat([{resourceId: resourceInfo.resourceId}]);

        const untreatedResources = differenceBy(allUntreatedResources, resolveResources, 'resourceId');
        if (!isEmpty(untreatedResources)) {
            throw new ApplicationError(ctx.gettext('presentable-resolve-resource-integrity-validate-failed'), {untreatedResources});
        }

        const invalidResolveResources = differenceBy(resolveResources, allUntreatedResources, 'resourceId');
        if (!isEmpty(invalidResolveResources)) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'resolveResources'), {invalidResolveResources});
        }

        const resourceMap: Map<string, ResourceInfo> = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfoV2}/list?resourceIds=${resolveResources.map(x => x.resourceId).toString()}&projection=resourceName,policies,status`)
            .then(list => new Map(list.map(x => [x.resourceId, x])));

        const invalidPolicies = [], offlineResources = [];
        for (let i = 0, j = resolveResources.length; i < j; i++) {
            let resolveResource = resolveResources[i];
            const resourceInfo = resourceMap.get(resolveResource.resourceId);
            if (resourceInfo.status !== 1) {
                offlineResources.push({resourceId: resourceInfo.resourceId, resourceName: resourceInfo.resourceName});
            }
            resolveResource.resourceName = resourceInfo.resourceName;
            resolveResource.contracts.forEach(item => {
                if (!resourceInfo.policies.some(x => x.policyId === item.policyId && x.status === 1)) {
                    invalidPolicies.push(pick(resourceInfo, ['resourceId', 'resourceName']));
                }
            });
        }
        if (!isEmpty(invalidPolicies)) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'resolveResources'), {invalidPolicies});
        }
        if (!isEmpty(offlineResources)) {
            throw new ApplicationError(ctx.gettext('be-sign-subject-offline'), {offlineResources});
        }
    }

    /**
     * 策略校验
     * @param policyIds
     * @private
     */
    async _validateSubjectPolicies(policies: PolicyInfo[], subjectType: SubjectTypeEnum): Promise<PolicyInfo[]> {
        if (isEmpty(policies)) {
            return [];
        }
        if (uniqBy(policies, 'policyId').length !== policies.length) {
            throw new ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }
        const policyInfos = await this.outsideApiService.getPolicies(policies.map(x => x.policyId), subjectType, ['policyId', 'policyName', 'userId']);
        const invalidPolicies = differenceBy(policies, policyInfos, 'policyId');
        if (!isEmpty(invalidPolicies)) {
            throw new ApplicationError(this.ctx.gettext('subject-policy-validate-failed'), invalidPolicies);
        }
        return policyInfos;
    }
}