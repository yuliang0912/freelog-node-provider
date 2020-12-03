import {inject, provide} from 'midway';
import {assign, chain, differenceBy, isArray, isEmpty, pick, uniqBy} from 'lodash';
import {PresentableAuthStatusEnum, PresentableOnlineStatusEnum} from "../../enum";
import {
    BasePolicyInfo, CreatePresentableOptions, INodeService,
    IOutsideApiService, IPresentableAuthService,
    IPresentableService, IPresentableVersionService,
    PolicyInfo, PresentableInfo, ResolveResource,
    ResourceInfo, UpdatePresentableOptions
} from '../../interface';
import {ApplicationError, FreelogContext, IMongodbOperation, PageResult, SubjectTypeEnum} from 'egg-freelog-base';

@provide()
export class PresentableService implements IPresentableService {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeService: INodeService;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableAuthService: IPresentableAuthService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableProvider: IMongodbOperation<PresentableInfo>;

    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    async createPresentable(options: CreatePresentableOptions) {

        const {resourceInfo, resolveResources, nodeInfo, policies, presentableName, presentableTitle, version, versionId, tags, coverImages} = options;

        const model = {
            presentableName, presentableTitle, version, tags, coverImages, resolveResources,
            policies: [],
            nodeId: nodeInfo.nodeId,
            userId: nodeInfo.ownerUserId,
            resourceInfo: pick(options.resourceInfo, ['resourceId', 'resourceName', 'resourceType']),
            authStatus: PresentableAuthStatusEnum.Unknown,
            onlineStatus: PresentableOnlineStatusEnum.Offline
        };

        await this._validateResolveResources(resourceInfo, resolveResources);

        if (isArray(policies) && !isEmpty(policies)) {
            model.policies = await this._validateAndCreateSubjectPolicies(options.policies);
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

        //TODO:后期待生产环境部署副本集,此处需要加入事务支持
        const presentableInfo = await this.presentableProvider.create(model);
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, versionId);

        return presentableInfo;
    }

    /**
     * 更新展品
     * @param presentableInfo
     * @param options
     */
    async updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo> {
        const updateModel: any = {
            presentableTitle: options.presentableTitle ?? presentableInfo.presentableTitle
        };
        if (isArray(options.tags)) {
            updateModel.tags = options.tags;
        }
        if (isArray(options.coverImages)) {
            updateModel.coverImages = options.coverImages;
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
            const existingPolicyNameSet = new Set(presentableInfo.policies.map(x => x.policyName));
            const duplicatePolicyNames = options.addPolicies.filter(x => existingPolicyNameSet.has(x.policyName));
            if (!isEmpty(duplicatePolicyNames)) {
                throw new ApplicationError(this.ctx.gettext('subject-policy-name-duplicate-failed'), duplicatePolicyNames);
            }
            const createdPolicyList = await this._validateAndCreateSubjectPolicies(options.addPolicies);
            for (const createdPolicy of createdPolicyList) {
                if (existingPolicyMap.has(createdPolicy.policyId)) {
                    throw new ApplicationError(this.ctx.gettext('policy-create-duplicate-error'), createdPolicy);
                }
                existingPolicyMap.set(createdPolicy.policyId, createdPolicy);
            }
        }
        if (isArray(options.updatePolicies) || isArray(options.addPolicies)) {
            updateModel.policies = [...existingPolicyMap.values()];
            // updateModel.onlineStatus = updateModel.policies.some(x => x.status === 1) ? PresentableOnlineStatusEnum.Online : PresentableOnlineStatusEnum.Offline;
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

    /**
     * 更新展品版本
     * @param presentableInfo
     * @param version
     * @param resourceVersionId
     */
    async updatePresentableVersion(presentableInfo: PresentableInfo, version: string, resourceVersionId: string): Promise<boolean> {
        await this.presentableProvider.updateOne({_id: presentableInfo.presentableId}, {version});
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, resourceVersionId);
        return true;
    }

    /**
     * 更新展品上下线状态
     * @param presentableInfo
     * @param onlineStatus
     */
    async updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum): Promise<boolean> {
        if (onlineStatus === PresentableOnlineStatusEnum.Online) {
            if (!presentableInfo.policies.some(x => x.status === 1)) {
                throw new ApplicationError(this.ctx.gettext('presentable-online-policy-validate-error'));
            }
            const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'authTree');
            const presentableNodeSideAuthResult = await this.presentableAuthService.presentableNodeSideAuth(presentableInfo, presentableVersionInfo.authTree);
            if (!presentableNodeSideAuthResult.isAuth) {
                throw new ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    nodeSideAuthResult: presentableNodeSideAuthResult
                });
            }
            const presentableUpstreamAuthResult = await this.presentableAuthService.presentableUpstreamAuth(presentableInfo, presentableVersionInfo.authTree);
            if (!presentableUpstreamAuthResult.isAuth) {
                throw new ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    upstreamAuthResult: presentableUpstreamAuthResult
                });
            }
        }

        const isSuccessful = await this.presentableProvider.updateOne({_id: presentableInfo.presentableId}, {onlineStatus}).then(data => Boolean(data.ok));
        if (!isSuccessful || presentableInfo.resourceInfo.resourceType !== 'theme') {
            return isSuccessful;
        }

        const isOnline = onlineStatus === PresentableOnlineStatusEnum.Online;
        await this.nodeService.updateNodeInfo(presentableInfo.nodeId, {themeId: isOnline ? presentableInfo.presentableId : ''})
        await this.presentableProvider.updateMany({
            _id: {$ne: presentableInfo.presentableId},
            nodeId: presentableInfo.nodeId,
            'resourceInfo.resourceType': presentableInfo.presentableId
        }, {onlineStatus: 0});
        return isSuccessful;
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

    async findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<PresentableInfo>> {
        return this.presentableProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort ?? {createDate: -1});
    }

    async count(condition: object): Promise<number> {
        return this.presentableProvider.count(condition);
    }

    async fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]> {
        if (!isArray(presentables) || isEmpty(presentables)) {
            return presentables;
        }
        const condition = {$or: []};
        for (const {presentableId, version} of presentables) {
            condition.$or.push({presentableId, version});
        }
        const presentableVersionPropertyMap = await this.presentableVersionService.find(condition, 'presentableId resourceSystemProperty versionProperty resourceCustomPropertyDescriptors presentableRewriteProperty').then(list => {
            return new Map(list.map(x => [x.presentableId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? (<any>presentable).toObject() : presentable;
            const versionProperty = presentableVersionPropertyMap.get(presentable.presentableId);
            presentableInfo.versionProperty = versionProperty?.versionProperty ?? {};
            if (isLoadResourceCustomPropertyDescriptors) {
                presentableInfo.resourceSystemProperty = versionProperty?.resourceSystemProperty ?? {};
                presentableInfo.resourceCustomPropertyDescriptors = versionProperty?.resourceCustomPropertyDescriptors ?? {};
            }
            if (isLoadPresentableRewriteProperty) {
                presentableInfo.presentableRewriteProperty = versionProperty?.presentableRewriteProperty ?? {};
            }
            return presentableInfo;
        });
    }

    async fillPresentablePolicyInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]> {
        if (!isArray(presentables) || isEmpty(presentables)) {
            return presentables;
        }
        const policyIds = chain(presentables).filter(x => isArray(x?.policies) && !isEmpty(x.policies)).map(x => x.policies.map(m => m.policyId)).flatten().uniq().value();
        if (isEmpty(policyIds)) {
            return presentables;
        }
        const policyMap: Map<string, BasePolicyInfo> = await this.outsideApiService.getPolicies(policyIds, SubjectTypeEnum.Presentable, ['policyId', 'policyText', 'fsmDescriptionInfo']).then(list => {
            return new Map(list.map(x => [x.policyId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? (<any>presentable).toObject() : presentable;
            presentableInfo.policies.forEach(policyInfo => {
                const {policyText, fsmDescriptionInfo} = policyMap.get(policyInfo.policyId) ?? {};
                policyInfo.policyText = policyText;
                policyInfo.fsmDescriptionInfo = fsmDescriptionInfo;
            })
            return presentableInfo;
        });
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

        const resourceMap = await this.outsideApiService.getResourceListByIds(resolveResources.map(x => x.resourceId), {projection: 'resourceId,resourceName,policies,status'})
            .then(list => new Map(list.map(x => [x.resourceId, x])));

        const invalidPolicies = [], offlineResources = [];
        for (const resolveResource of resolveResources) {
            const resourceInfo = resourceMap.get(resolveResource.resourceId);
            if (resourceInfo.status !== 1) {
                offlineResources.push({resourceId: resourceInfo.resourceId, resourceName: resourceInfo.resourceName});
            }
            resolveResource.resourceName = resourceInfo.resourceName;
            for (const resolveContract of resolveResource.contracts) {
                if (!resourceInfo.policies.some(x => x.policyId === resolveContract.policyId && x.status === 1)) {
                    invalidPolicies.push(pick(resourceInfo, ['resourceId', 'resourceName']));
                }
            }
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
     * @param policies
     */
    async _validateAndCreateSubjectPolicies(policies: PolicyInfo[]): Promise<PolicyInfo[]> {
        if (isEmpty(policies)) {
            return [];
        }
        // 名称不允许重复
        if (uniqBy(policies, 'policyName').length !== policies.length) {
            throw new ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }
        const policyInfos = await this.outsideApiService.createPolicies(policies.map(x => x.policyText));
        if (policyInfos.length !== policies.length) {
            throw new ApplicationError(this.ctx.gettext('subject-policy-create-failed'));
        }
        if (uniqBy(policyInfos, 'policyId').length !== policyInfos.length) {
            throw new ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }

        const result: PolicyInfo[] = [];
        for (let i = 0, j = policyInfos.length; i < j; i++) {
            const policyInfo = policyInfos[i];
            result.push({
                policyId: policyInfo.policyId,
                policyText: policyInfo.policyText,
                fsmDescriptionInfo: policyInfo.fsmDescriptionInfo,
                policyName: policies[i].policyName,
                status: policies[i].status ?? 1,
            })
        }
        return result;
    }
}
