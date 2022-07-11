import {inject, plugin, provide} from 'midway';
import {assign, chain, differenceBy, first, isArray, isEmpty, pick, uniqBy} from 'lodash';
import {PresentableAuthStatusEnum, PresentableOnlineStatusEnum} from '../../enum';
import {
    BasePolicyInfo, CreatePresentableOptions, findOptions, INodeService,
    IOutsideApiService, IPresentableAuthService,
    IPresentableService, IPresentableVersionService,
    PolicyInfo, PresentableInfo, ResolveResource,
    ResourceInfo, UpdatePresentableOptions
} from '../../interface';
import {
    ApplicationError, FreelogContext, IMongodbOperation, PageResult, SubjectTypeEnum
} from 'egg-freelog-base';
import {PresentableCommonChecker} from '../../extend/presentable-common-checker';
import {PresentableBatchAuthService} from './presentable-batch-auth-service';

@provide()
export class PresentableService implements IPresentableService {

    @inject()
    ctx: FreelogContext;
    @plugin()
    mongoose;
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
    @inject()
    presentableCommonChecker: PresentableCommonChecker;
    @inject()
    presentableBatchAuthService: PresentableBatchAuthService;

    /**
     * 查询合约被应用于那些展品
     * @param nodeId
     * @param contractIds
     */
    async contractAppliedPresentable(nodeId: number, contractIds: string[]) {
        const presentables = await this.presentableProvider.find({
            nodeId, 'resolveResources.contracts.contractId': {$in: contractIds}
        }, 'presentableId presentableName presentableTitle resolveResources');
        return contractIds.map(contractId => {
            const presentableList = presentables.filter(x => x.resolveResources.some(y => y.contracts.some(z => z.contractId === contractId)));
            return {
                contractId,
                presentables: presentableList.map(x => pick(x, ['presentableId', 'presentableName', 'presentableTitle']))
            };
        });
    }

    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    async createPresentable(options: CreatePresentableOptions) {

        const {
            resourceInfo, resolveResources, nodeInfo,
            policies, presentableName, presentableTitle,
            version, versionId, tags, coverImages
        } = options;

        const model = {
            presentableName, presentableTitle, version, tags, resolveResources,
            coverImages: coverImages.length ? coverImages : ['http://static.testfreelog.com/static/default_cover.png'],
            policies: [],
            nodeId: nodeInfo.nodeId,
            userId: nodeInfo.ownerUserId,
            resourceInfo: pick(options.resourceInfo, ['resourceId', 'resourceName', 'resourceType']),
            authStatus: PresentableAuthStatusEnum.Unknown,
            onlineStatus: PresentableOnlineStatusEnum.Offline
        };
        model.resourceInfo['resourceOwnerId'] = options.resourceInfo.userId;
        await this._validateResolveResources(resourceInfo, resolveResources);

        if (isArray(policies) && !isEmpty(policies)) {
            model.policies = await this._validateAndCreateSubjectPolicies(options.policies);
            if (model.policies.some(x => x.status === 1)) {
                model.onlineStatus = PresentableOnlineStatusEnum.Online;
            }
        }

        const beSignSubjects = chain(resolveResources)
            .map(({resourceId, contracts}) => contracts.map(({policyId}) => Object({
                subjectId: resourceId, policyId
            }))).flattenDeep().value();

        // 批量签约,已签过的则直接返回对应的合约ID.合约需要作为创建展品的前置必要条件
        await this.outsideApiService.batchSignNodeContracts(nodeInfo.nodeId, beSignSubjects).then(contracts => {
            const contractMap = new Map<string, string>(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
            model.resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(resolveContractInfo => {
                resolveContractInfo.contractId = contractMap.get(resolveResource.resourceId + resolveContractInfo.policyId) ?? '';
            }));
        });

        // TODO:后期待生产环境部署副本集,此处需要加入事务支持
        const presentableInfo = await this.presentableProvider.create(model);
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, versionId, presentableInfo.version);

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
        if (presentableInfo.onlineStatus === 1 && updateModel.policies && !updateModel.policies.some(x => x.status === 1)) {
            throw new ApplicationError('展品已上线,至少需要保留一个有效的策略');
        }

        // 如果重新选择已解决资源的策略,则系统会重新进行签约,并且赋值
        if (!isEmpty(options.resolveResources)) {
            const invalidResolveResources = differenceBy(options.resolveResources, presentableInfo.resolveResources, 'resourceId');
            if (invalidResolveResources.length) {
                throw new ApplicationError(this.ctx.gettext('presentable-update-resolve-release-invalid-error'), {invalidResolveResources});
            }
            const beSignSubjects = chain(options.resolveResources)
                .map(({resourceId, contracts}) => contracts.map(({policyId}) => Object({
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
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, resourceVersionId, version);
        return true;
    }

    /**
     * 更新展品上下线状态
     * @param presentableInfo
     * @param onlineStatus
     * @param updatePolicies
     */
    async updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum, updatePolicies?: PolicyInfo[]): Promise<boolean> {
        const modifyModel: Partial<PresentableInfo> = {onlineStatus};
        const isOnline = onlineStatus === PresentableOnlineStatusEnum.Online;
        if (updatePolicies) {
            for (const policy of presentableInfo.policies) {
                const updatePolicyInfo = updatePolicies.find(x => x.policyId === policy.policyId);
                if (updatePolicyInfo) {
                    policy.status = updatePolicyInfo.status;
                }
            }
            modifyModel.policies = presentableInfo.policies;
        }
        if (isOnline) {
            if (!presentableInfo.policies.some(x => x.status === 1)) {
                throw new ApplicationError(this.ctx.gettext('presentable-online-policy-validate-error'));
            }
            const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'authTree');
            const presentableAuthResult = await this.presentableBatchAuthService.batchPresentableAuth([presentableInfo], new Map([[presentableInfo.presentableId, presentableVersionInfo.authTree]]), 4).then(results => {
                return results.get(presentableInfo.presentableId);
            });
            if (!presentableAuthResult.isAuth) {
                throw new ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    nodeSideAuthResult: presentableAuthResult
                });
            }
        }

        const isSuccessful = await this.presentableProvider.updateOne({_id: presentableInfo.presentableId}, modifyModel).then(data => Boolean(data.ok));
        if (!isSuccessful || first<string>(presentableInfo.resourceInfo.resourceType) !== '主题') { // ResourceTypeEnum.THEME
            return isSuccessful;
        }

        await this.nodeService.updateNodeInfo(presentableInfo.nodeId, {nodeThemeId: isOnline ? presentableInfo.presentableId : ''});
        await this.presentableProvider.updateMany({
            _id: {$ne: presentableInfo.presentableId},
            nodeId: presentableInfo.nodeId,
            'resourceInfo.resourceType': '主题'
        }, {onlineStatus: 0});
        return isSuccessful;
    }

    /**
     * 搜索展品列表
     * @param condition
     * @param keywords
     * @param options
     */
    async searchIntervalList(condition: object, keywords?: string, options?: findOptions<PresentableInfo>) {
        if (condition['_id']) {
            condition['_id'] = this.mongoose.convertObjectId(condition['_id']);
        }
        const pipeline: any = [
            {
                $lookup: {
                    from: 'nodes',
                    localField: 'nodeId',
                    foreignField: 'nodeId',
                    as: 'nodes'
                }
            }
        ];
        if (Object.keys(condition).length) {
            pipeline.unshift({$match: condition});
        }
        if (keywords?.length) {
            const searchExp = {$regex: keywords, $options: 'i'};
            pipeline.push({$match: {$or: [{presentableName: searchExp}, {'resourceInfo.resourceName': searchExp}, {'nodes.nodeName': searchExp}]}});
        }

        const [totalItemInfo] = await this.presentableProvider.aggregate([...pipeline, ...[{$count: 'totalItem'}]]);
        const {totalItem = 0} = totalItemInfo ?? {};

        pipeline.push({$sort: options?.sort ?? {userId: -1}}, {$skip: options?.skip ?? 0}, {$limit: options?.limit ?? 10});
        const dataList = await this.presentableProvider.aggregate(pipeline);

        return {
            skip: options?.skip ?? 0, limit: options?.limit ?? 10, totalItem, dataList
        };
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
        return this.presentableProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort ?? {updateDate: -1});
    }

    async count(condition: object): Promise<number> {
        return this.presentableProvider.count(condition);
    }

    /**
     * 填充展品版本属性
     * @param presentables
     * @param isLoadResourceCustomPropertyDescriptors
     * @param isLoadPresentableRewriteProperty
     */
    async fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]> {
        if (!isArray(presentables) || isEmpty(presentables)) {
            return presentables;
        }

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));

        const presentableVersionPropertyMap = await this.presentableVersionService.find({presentableVersionId: {$in: presentableVersionIds}}, 'presentableId resourceSystemProperty versionProperty resourceCustomPropertyDescriptors presentableRewriteProperty').then(list => {
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

    /**
     * 填充展品策略信息
     * @param presentables
     * @param isTranslate
     */
    async fillPresentablePolicyInfo(presentables: PresentableInfo[], isTranslate: boolean = false): Promise<PresentableInfo[]> {
        if (!isArray(presentables) || isEmpty(presentables)) {
            return presentables;
        }
        const policyIds = chain(presentables).filter(x => isArray(x?.policies) && !isEmpty(x.policies)).map(x => x.policies.map(m => m.policyId)).flatten().uniq().value();
        if (isEmpty(policyIds)) {
            return presentables;
        }
        const policyMap: Map<string, BasePolicyInfo> = await this.outsideApiService.getPolicies(policyIds, SubjectTypeEnum.Presentable, ['policyId', 'policyText', 'fsmDescriptionInfo'], isTranslate).then(list => {
            return new Map(list.map(x => [x.policyId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? (<any>presentable).toObject() : presentable;
            presentableInfo.policies.forEach(policyInfo => {
                const {policyText, fsmDescriptionInfo, translateInfo} = policyMap.get(policyInfo.policyId) ?? {};
                policyInfo.translateInfo = translateInfo;
                policyInfo.policyText = policyText;
                policyInfo.fsmDescriptionInfo = fsmDescriptionInfo;
            });
            return presentableInfo;
        });
    }

    /**
     * 填充展品的资源信息
     */
    async fillPresentableResourceInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]> {
        const resourceIds = presentables.map(x => x.resourceInfo?.resourceId).filter(x => Boolean(x));
        const resourceList = await this.outsideApiService.getResourceListByIds(resourceIds, {
            projection: 'resourceId,resourceName,resourceType,coverImages,intro,resourceVersions,tags,status'
        });
        if (isEmpty(resourceList)) {
            return presentables;
        }
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? (<any>presentable).toObject() : presentable;
            presentableInfo.resourceInfo = resourceList.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId);
            return presentableInfo;
        });
    }

    /**
     * 填充展品资源版本信息
     * @param presentables
     */
    async fillPresentableResourceVersionInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]> {
        const resourceVersionIds = presentables.map(x => this.presentableCommonChecker.generateResourceVersionId(x.resourceInfo.resourceId, x.version));
        const resourceVersionList = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
            projection: 'resourceId,fileSha1,description,createDate,updateDate'
        });
        if (isEmpty(resourceVersionList)) {
            return presentables;
        }
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? (<any>presentable).toObject() : presentable;
            presentableInfo.resourceVersionInfo = resourceVersionList.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId);
            return presentableInfo;
        });
    }

    /**
     * 节点创建的展品数量统计
     * @param nodeIds
     */
    nodePresentableStatistics(nodeIds: number[]): Promise<Array<{ nodeId: number, count: number }>> {
        const condition = [
            {$match: {nodeId: {$in: nodeIds}}},
            {$group: {_id: '$nodeId', count: {'$sum': 1}}},
            {$project: {nodeId: '$_id', _id: 0, count: '$count'}},
        ];
        return this.presentableProvider.aggregate(condition);
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
                if (!resourceInfo.policies.some(x => x.policyId === resolveContract.policyId)) {
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
            });
        }
        return result;
    }
}
