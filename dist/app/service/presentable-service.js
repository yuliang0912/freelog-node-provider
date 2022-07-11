"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableService = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const enum_1 = require("../../enum");
const egg_freelog_base_1 = require("egg-freelog-base");
const presentable_common_checker_1 = require("../../extend/presentable-common-checker");
const presentable_batch_auth_service_1 = require("./presentable-batch-auth-service");
let PresentableService = class PresentableService {
    ctx;
    mongoose;
    nodeService;
    outsideApiService;
    presentableAuthService;
    presentableVersionService;
    presentableProvider;
    presentableCommonChecker;
    presentableBatchAuthService;
    /**
     * 查询合约被应用于那些展品
     * @param nodeId
     * @param contractIds
     */
    async contractAppliedPresentable(nodeId, contractIds) {
        const presentables = await this.presentableProvider.find({
            nodeId, 'resolveResources.contracts.contractId': { $in: contractIds }
        }, 'presentableId presentableName presentableTitle resolveResources');
        return contractIds.map(contractId => {
            const presentableList = presentables.filter(x => x.resolveResources.some(y => y.contracts.some(z => z.contractId === contractId)));
            return {
                contractId,
                presentables: presentableList.map(x => (0, lodash_1.pick)(x, ['presentableId', 'presentableName', 'presentableTitle']))
            };
        });
    }
    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    async createPresentable(options) {
        const { resourceInfo, resolveResources, nodeInfo, policies, presentableName, presentableTitle, version, versionId, tags, coverImages } = options;
        const model = {
            presentableName, presentableTitle, version, tags, resolveResources,
            coverImages: coverImages.length ? coverImages : ['http://static.testfreelog.com/static/default_cover.png'],
            policies: [],
            nodeId: nodeInfo.nodeId,
            userId: nodeInfo.ownerUserId,
            resourceInfo: (0, lodash_1.pick)(options.resourceInfo, ['resourceId', 'resourceName', 'resourceType']),
            authStatus: enum_1.PresentableAuthStatusEnum.Unknown,
            onlineStatus: enum_1.PresentableOnlineStatusEnum.Offline
        };
        model.resourceInfo['resourceOwnerId'] = options.resourceInfo.userId;
        await this._validateResolveResources(resourceInfo, resolveResources);
        if ((0, lodash_1.isArray)(policies) && !(0, lodash_1.isEmpty)(policies)) {
            model.policies = await this._validateAndCreateSubjectPolicies(options.policies);
            if (model.policies.some(x => x.status === 1)) {
                model.onlineStatus = enum_1.PresentableOnlineStatusEnum.Online;
            }
        }
        const beSignSubjects = (0, lodash_1.chain)(resolveResources)
            .map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
            subjectId: resourceId, policyId
        }))).flattenDeep().value();
        // 批量签约,已签过的则直接返回对应的合约ID.合约需要作为创建展品的前置必要条件
        await this.outsideApiService.batchSignNodeContracts(nodeInfo.nodeId, beSignSubjects).then(contracts => {
            const contractMap = new Map(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
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
    async updatePresentable(presentableInfo, options) {
        const updateModel = {
            presentableTitle: options.presentableTitle ?? presentableInfo.presentableTitle
        };
        if ((0, lodash_1.isArray)(options.tags)) {
            updateModel.tags = options.tags;
        }
        if ((0, lodash_1.isArray)(options.coverImages)) {
            updateModel.coverImages = options.coverImages;
        }
        const existingPolicyMap = new Map(presentableInfo.policies.map(x => [x.policyId, x]));
        if ((0, lodash_1.isArray)(options.updatePolicies)) {
            options.updatePolicies.forEach(modifyPolicy => {
                const existingPolicy = existingPolicyMap.get(modifyPolicy.policyId);
                if (existingPolicy) {
                    existingPolicy.policyName = modifyPolicy.policyName ?? existingPolicy.policyName;
                    existingPolicy.status = modifyPolicy.status ?? existingPolicy.status;
                }
            });
        }
        if ((0, lodash_1.isArray)(options.addPolicies)) {
            const existingPolicyNameSet = new Set(presentableInfo.policies.map(x => x.policyName));
            const duplicatePolicyNames = options.addPolicies.filter(x => existingPolicyNameSet.has(x.policyName));
            if (!(0, lodash_1.isEmpty)(duplicatePolicyNames)) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-name-duplicate-failed'), duplicatePolicyNames);
            }
            const createdPolicyList = await this._validateAndCreateSubjectPolicies(options.addPolicies);
            for (const createdPolicy of createdPolicyList) {
                if (existingPolicyMap.has(createdPolicy.policyId)) {
                    throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('policy-create-duplicate-error'), createdPolicy);
                }
                existingPolicyMap.set(createdPolicy.policyId, createdPolicy);
            }
        }
        if ((0, lodash_1.isArray)(options.updatePolicies) || (0, lodash_1.isArray)(options.addPolicies)) {
            updateModel.policies = [...existingPolicyMap.values()];
            // updateModel.onlineStatus = updateModel.policies.some(x => x.status === 1) ? PresentableOnlineStatusEnum.Online : PresentableOnlineStatusEnum.Offline;
        }
        if (presentableInfo.onlineStatus === 1 && updateModel.policies && !updateModel.policies.some(x => x.status === 1)) {
            throw new egg_freelog_base_1.ApplicationError('展品已上线,至少需要保留一个有效的策略');
        }
        // 如果重新选择已解决资源的策略,则系统会重新进行签约,并且赋值
        if (!(0, lodash_1.isEmpty)(options.resolveResources)) {
            const invalidResolveResources = (0, lodash_1.differenceBy)(options.resolveResources, presentableInfo.resolveResources, 'resourceId');
            if (invalidResolveResources.length) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-update-resolve-release-invalid-error'), { invalidResolveResources });
            }
            const beSignSubjects = (0, lodash_1.chain)(options.resolveResources)
                .map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
                subjectId: resourceId, policyId
            }))).flattenDeep().value();
            const contractMap = await this.outsideApiService.batchSignNodeContracts(presentableInfo.nodeId, beSignSubjects).then(contracts => {
                return new Map(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
            });
            options.resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(item => {
                item.contractId = contractMap.get(resolveResource.resourceId + item.policyId) ?? '';
            }));
            updateModel.resolveResources = presentableInfo.resolveResources.map(resolveResource => {
                const modifyResolveResource = options.resolveResources.find(x => x.resourceId === resolveResource.resourceId);
                return modifyResolveResource ? (0, lodash_1.assign)(resolveResource, modifyResolveResource) : resolveResource;
            });
        }
        return this.presentableProvider.findOneAndUpdate({ _id: presentableInfo.presentableId }, updateModel, { new: true });
    }
    /**
     * 更新展品版本
     * @param presentableInfo
     * @param version
     * @param resourceVersionId
     */
    async updatePresentableVersion(presentableInfo, version, resourceVersionId) {
        await this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, { version });
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, resourceVersionId, version);
        return true;
    }
    /**
     * 更新展品上下线状态
     * @param presentableInfo
     * @param onlineStatus
     * @param updatePolicies
     */
    async updateOnlineStatus(presentableInfo, onlineStatus, updatePolicies) {
        const modifyModel = { onlineStatus };
        const isOnline = onlineStatus === enum_1.PresentableOnlineStatusEnum.Online;
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
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-online-policy-validate-error'));
            }
            const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'authTree');
            const presentableAuthResult = await this.presentableBatchAuthService.batchPresentableAuth([presentableInfo], new Map([[presentableInfo.presentableId, presentableVersionInfo.authTree]]), 4).then(results => {
                return results.get(presentableInfo.presentableId);
            });
            if (!presentableAuthResult.isAuth) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    nodeSideAuthResult: presentableAuthResult
                });
            }
        }
        const isSuccessful = await this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, modifyModel).then(data => Boolean(data.ok));
        if (!isSuccessful || (0, lodash_1.first)(presentableInfo.resourceInfo.resourceType) !== '主题') { // ResourceTypeEnum.THEME
            return isSuccessful;
        }
        await this.nodeService.updateNodeInfo(presentableInfo.nodeId, { nodeThemeId: isOnline ? presentableInfo.presentableId : '' });
        await this.presentableProvider.updateMany({
            _id: { $ne: presentableInfo.presentableId },
            nodeId: presentableInfo.nodeId,
            'resourceInfo.resourceType': '主题'
        }, { onlineStatus: 0 });
        return isSuccessful;
    }
    /**
     * 搜索展品列表
     * @param condition
     * @param keywords
     * @param options
     */
    async searchIntervalList(condition, keywords, options) {
        if (condition['_id']) {
            condition['_id'] = this.mongoose.convertObjectId(condition['_id']);
        }
        const pipeline = [
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
            pipeline.unshift({ $match: condition });
        }
        if (keywords?.length) {
            const searchExp = { $regex: keywords, $options: 'i' };
            pipeline.push({ $match: { $or: [{ presentableName: searchExp }, { 'resourceInfo.resourceName': searchExp }, { 'nodes.nodeName': searchExp }] } });
        }
        const [totalItemInfo] = await this.presentableProvider.aggregate([...pipeline, ...[{ $count: 'totalItem' }]]);
        const { totalItem = 0 } = totalItemInfo ?? {};
        pipeline.push({ $sort: options?.sort ?? { userId: -1 } }, { $skip: options?.skip ?? 0 }, { $limit: options?.limit ?? 10 });
        const dataList = await this.presentableProvider.aggregate(pipeline);
        return {
            skip: options?.skip ?? 0, limit: options?.limit ?? 10, totalItem, dataList
        };
    }
    async findOne(condition, ...args) {
        return this.presentableProvider.findOne(condition, ...args);
    }
    async findById(presentableId, ...args) {
        return this.presentableProvider.findById(presentableId, ...args);
    }
    async find(condition, ...args) {
        return this.presentableProvider.find(condition, ...args);
    }
    async findByIds(presentableIds, ...args) {
        return this.presentableProvider.find({ _id: { $in: presentableIds } }, ...args);
    }
    async findIntervalList(condition, skip, limit, projection, sort) {
        return this.presentableProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort ?? { updateDate: -1 });
    }
    async count(condition) {
        return this.presentableProvider.count(condition);
    }
    /**
     * 填充展品版本属性
     * @param presentables
     * @param isLoadResourceCustomPropertyDescriptors
     * @param isLoadPresentableRewriteProperty
     */
    async fillPresentableVersionProperty(presentables, isLoadResourceCustomPropertyDescriptors, isLoadPresentableRewriteProperty) {
        if (!(0, lodash_1.isArray)(presentables) || (0, lodash_1.isEmpty)(presentables)) {
            return presentables;
        }
        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableVersionPropertyMap = await this.presentableVersionService.find({ presentableVersionId: { $in: presentableVersionIds } }, 'presentableId resourceSystemProperty versionProperty resourceCustomPropertyDescriptors presentableRewriteProperty').then(list => {
            return new Map(list.map(x => [x.presentableId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
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
    async fillPresentablePolicyInfo(presentables, isTranslate = false) {
        if (!(0, lodash_1.isArray)(presentables) || (0, lodash_1.isEmpty)(presentables)) {
            return presentables;
        }
        const policyIds = (0, lodash_1.chain)(presentables).filter(x => (0, lodash_1.isArray)(x?.policies) && !(0, lodash_1.isEmpty)(x.policies)).map(x => x.policies.map(m => m.policyId)).flatten().uniq().value();
        if ((0, lodash_1.isEmpty)(policyIds)) {
            return presentables;
        }
        const policyMap = await this.outsideApiService.getPolicies(policyIds, egg_freelog_base_1.SubjectTypeEnum.Presentable, ['policyId', 'policyText', 'fsmDescriptionInfo'], isTranslate).then(list => {
            return new Map(list.map(x => [x.policyId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
            presentableInfo.policies.forEach(policyInfo => {
                const { policyText, fsmDescriptionInfo, translateInfo } = policyMap.get(policyInfo.policyId) ?? {};
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
    async fillPresentableResourceInfo(presentables) {
        const resourceIds = presentables.map(x => x.resourceInfo?.resourceId).filter(x => Boolean(x));
        const resourceList = await this.outsideApiService.getResourceListByIds(resourceIds, {
            projection: 'resourceId,resourceName,resourceType,coverImages,intro,resourceVersions,tags,status'
        });
        if ((0, lodash_1.isEmpty)(resourceList)) {
            return presentables;
        }
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
            presentableInfo.resourceInfo = resourceList.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId);
            return presentableInfo;
        });
    }
    /**
     * 填充展品资源版本信息
     * @param presentables
     */
    async fillPresentableResourceVersionInfo(presentables) {
        const resourceVersionIds = presentables.map(x => this.presentableCommonChecker.generateResourceVersionId(x.resourceInfo.resourceId, x.version));
        const resourceVersionList = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
            projection: 'resourceId,fileSha1,description,createDate,updateDate'
        });
        if ((0, lodash_1.isEmpty)(resourceVersionList)) {
            return presentables;
        }
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
            presentableInfo.resourceVersionInfo = resourceVersionList.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId);
            return presentableInfo;
        });
    }
    /**
     * 节点创建的展品数量统计
     * @param nodeIds
     */
    nodePresentableStatistics(nodeIds) {
        const condition = [
            { $match: { nodeId: { $in: nodeIds } } },
            { $group: { _id: '$nodeId', count: { '$sum': 1 } } },
            { $project: { nodeId: '$_id', _id: 0, count: '$count' } },
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
    async _validateResolveResources(resourceInfo, resolveResources) {
        const { ctx } = this;
        const allUntreatedResources = resourceInfo.baseUpcastResources.concat([{ resourceId: resourceInfo.resourceId }]);
        const untreatedResources = (0, lodash_1.differenceBy)(allUntreatedResources, resolveResources, 'resourceId');
        if (!(0, lodash_1.isEmpty)(untreatedResources)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('presentable-resolve-resource-integrity-validate-failed'), { untreatedResources });
        }
        const invalidResolveResources = (0, lodash_1.differenceBy)(resolveResources, allUntreatedResources, 'resourceId');
        if (!(0, lodash_1.isEmpty)(invalidResolveResources)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('params-validate-failed', 'resolveResources'), { invalidResolveResources });
        }
        const resourceMap = await this.outsideApiService.getResourceListByIds(resolveResources.map(x => x.resourceId), { projection: 'resourceId,resourceName,policies,status' })
            .then(list => new Map(list.map(x => [x.resourceId, x])));
        const invalidPolicies = [], offlineResources = [];
        for (const resolveResource of resolveResources) {
            const resourceInfo = resourceMap.get(resolveResource.resourceId);
            if (resourceInfo.status !== 1) {
                offlineResources.push({ resourceId: resourceInfo.resourceId, resourceName: resourceInfo.resourceName });
            }
            resolveResource.resourceName = resourceInfo.resourceName;
            for (const resolveContract of resolveResource.contracts) {
                if (!resourceInfo.policies.some(x => x.policyId === resolveContract.policyId)) {
                    invalidPolicies.push((0, lodash_1.pick)(resourceInfo, ['resourceId', 'resourceName']));
                }
            }
        }
        if (!(0, lodash_1.isEmpty)(invalidPolicies)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('params-validate-failed', 'resolveResources'), { invalidPolicies });
        }
        if (!(0, lodash_1.isEmpty)(offlineResources)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('be-sign-subject-offline'), { offlineResources });
        }
    }
    /**
     * 策略校验
     * @param policies
     */
    async _validateAndCreateSubjectPolicies(policies) {
        if ((0, lodash_1.isEmpty)(policies)) {
            return [];
        }
        // 名称不允许重复
        if ((0, lodash_1.uniqBy)(policies, 'policyName').length !== policies.length) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }
        const policyInfos = await this.outsideApiService.createPolicies(policies.map(x => x.policyText));
        if (policyInfos.length !== policies.length) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-create-failed'));
        }
        if ((0, lodash_1.uniqBy)(policyInfos, 'policyId').length !== policyInfos.length) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }
        const result = [];
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
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.plugin)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "mongoose", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "nodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableAuthService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], PresentableService.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_batch_auth_service_1.PresentableBatchAuthService)
], PresentableService.prototype, "presentableBatchAuthService", void 0);
PresentableService = __decorate([
    (0, midway_1.provide)()
], PresentableService);
exports.PresentableService = PresentableService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9wcmVzZW50YWJsZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQztBQUMvQyxtQ0FBMEY7QUFDMUYscUNBQWtGO0FBUWxGLHVEQUUwQjtBQUMxQix3RkFBaUY7QUFDakYscUZBQTZFO0FBRzdFLElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBRzNCLEdBQUcsQ0FBaUI7SUFFcEIsUUFBUSxDQUFDO0lBRVQsV0FBVyxDQUFlO0lBRTFCLGlCQUFpQixDQUFxQjtJQUV0QyxzQkFBc0IsQ0FBMEI7SUFFaEQseUJBQXlCLENBQTZCO0lBRXRELG1CQUFtQixDQUFxQztJQUV4RCx3QkFBd0IsQ0FBMkI7SUFFbkQsMkJBQTJCLENBQThCO0lBRXpEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsTUFBYyxFQUFFLFdBQXFCO1FBQ2xFLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUNyRCxNQUFNLEVBQUUsdUNBQXVDLEVBQUUsRUFBQyxHQUFHLEVBQUUsV0FBVyxFQUFDO1NBQ3RFLEVBQUUsaUVBQWlFLENBQUMsQ0FBQztRQUN0RSxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDaEMsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25JLE9BQU87Z0JBQ0gs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