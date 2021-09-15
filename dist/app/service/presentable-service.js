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
let PresentableService = class PresentableService {
    ctx;
    nodeService;
    outsideApiService;
    presentableAuthService;
    presentableVersionService;
    presentableProvider;
    presentableCommonChecker;
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
                presentables: presentableList.map(x => lodash_1.pick(x, ['presentableId', 'presentableName', 'presentableTitle']))
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
            presentableName, presentableTitle, version, tags, coverImages, resolveResources,
            policies: [],
            nodeId: nodeInfo.nodeId,
            userId: nodeInfo.ownerUserId,
            resourceInfo: lodash_1.pick(options.resourceInfo, ['resourceId', 'resourceName', 'resourceType']),
            authStatus: enum_1.PresentableAuthStatusEnum.Unknown,
            onlineStatus: enum_1.PresentableOnlineStatusEnum.Offline
        };
        await this._validateResolveResources(resourceInfo, resolveResources);
        if (lodash_1.isArray(policies) && !lodash_1.isEmpty(policies)) {
            model.policies = await this._validateAndCreateSubjectPolicies(options.policies);
            if (model.policies.some(x => x.status === 1)) {
                model.onlineStatus = enum_1.PresentableOnlineStatusEnum.Online;
            }
        }
        const beSignSubjects = lodash_1.chain(resolveResources).map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
            subjectId: resourceId, policyId
        }))).flattenDeep().value();
        // 批量签约,已签过的则直接返回对应的合约ID.合约需要作为创建展品的前置必要条件
        await this.outsideApiService.batchSignNodeContracts(nodeInfo.nodeId, beSignSubjects).then(contracts => {
            const contractMap = new Map(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
            model.resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(resolveContractInfo => {
                resolveContractInfo.contractId = contractMap.get(resolveResource.resourceId + resolveContractInfo.policyId) ?? '';
            }));
        });
        //TODO:后期待生产环境部署副本集,此处需要加入事务支持
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
        if (lodash_1.isArray(options.tags)) {
            updateModel.tags = options.tags;
        }
        if (lodash_1.isArray(options.coverImages)) {
            updateModel.coverImages = options.coverImages;
        }
        const existingPolicyMap = new Map(presentableInfo.policies.map(x => [x.policyId, x]));
        if (lodash_1.isArray(options.updatePolicies)) {
            options.updatePolicies.forEach(modifyPolicy => {
                const existingPolicy = existingPolicyMap.get(modifyPolicy.policyId);
                if (existingPolicy) {
                    existingPolicy.policyName = modifyPolicy.policyName ?? existingPolicy.policyName;
                    existingPolicy.status = modifyPolicy.status ?? existingPolicy.status;
                }
            });
        }
        if (lodash_1.isArray(options.addPolicies)) {
            const existingPolicyNameSet = new Set(presentableInfo.policies.map(x => x.policyName));
            const duplicatePolicyNames = options.addPolicies.filter(x => existingPolicyNameSet.has(x.policyName));
            if (!lodash_1.isEmpty(duplicatePolicyNames)) {
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
        if (lodash_1.isArray(options.updatePolicies) || lodash_1.isArray(options.addPolicies)) {
            updateModel.policies = [...existingPolicyMap.values()];
            // updateModel.onlineStatus = updateModel.policies.some(x => x.status === 1) ? PresentableOnlineStatusEnum.Online : PresentableOnlineStatusEnum.Offline;
        }
        if (presentableInfo.onlineStatus === 1 && updateModel.policies && !updateModel.policies.some(x => x.status === 1)) {
            throw new egg_freelog_base_1.ApplicationError('展品已上线,至少需要保留一个有效的策略');
        }
        // 如果重新选择已解决资源的策略,则系统会重新进行签约,并且赋值
        if (!lodash_1.isEmpty(options.resolveResources)) {
            const invalidResolveResources = lodash_1.differenceBy(options.resolveResources, presentableInfo.resolveResources, 'resourceId');
            if (invalidResolveResources.length) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-update-resolve-release-invalid-error'), { invalidResolveResources });
            }
            const beSignSubjects = lodash_1.chain(options.resolveResources).map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
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
                return modifyResolveResource ? lodash_1.assign(resolveResource, modifyResolveResource) : resolveResource;
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
     */
    async updateOnlineStatus(presentableInfo, onlineStatus) {
        const isOnline = onlineStatus === enum_1.PresentableOnlineStatusEnum.Online;
        if (isOnline) {
            if (!presentableInfo.policies.some(x => x.status === 1)) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-online-policy-validate-error'));
            }
            const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'authTree');
            const presentableNodeSideAuthResult = await this.presentableAuthService.presentableNodeSideAuth(presentableInfo, presentableVersionInfo.authTree);
            if (!presentableNodeSideAuthResult.isAuth) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    nodeSideAuthResult: presentableNodeSideAuthResult
                });
            }
            const presentableUpstreamAuthResult = await this.presentableAuthService.presentableUpstreamAuth(presentableInfo, presentableVersionInfo.authTree);
            if (!presentableUpstreamAuthResult.isAuth) {
                throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-online-auth-validate-error'), {
                    upstreamAuthResult: presentableUpstreamAuthResult
                });
            }
        }
        const isSuccessful = await this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, { onlineStatus }).then(data => Boolean(data.ok));
        if (!isSuccessful || presentableInfo.resourceInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME) {
            return isSuccessful;
        }
        await this.nodeService.updateNodeInfo(presentableInfo.nodeId, { nodeThemeId: isOnline ? presentableInfo.presentableId : '' });
        await this.presentableProvider.updateMany({
            _id: { $ne: presentableInfo.presentableId },
            nodeId: presentableInfo.nodeId,
            'resourceInfo.resourceType': egg_freelog_base_1.ResourceTypeEnum.THEME
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
        return this.presentableProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort ?? { createDate: -1 });
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
        if (!lodash_1.isArray(presentables) || lodash_1.isEmpty(presentables)) {
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
        if (!lodash_1.isArray(presentables) || lodash_1.isEmpty(presentables)) {
            return presentables;
        }
        const policyIds = lodash_1.chain(presentables).filter(x => lodash_1.isArray(x?.policies) && !lodash_1.isEmpty(x.policies)).map(x => x.policies.map(m => m.policyId)).flatten().uniq().value();
        if (lodash_1.isEmpty(policyIds)) {
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
            projection: 'resourceId,resourceName,resourceType,coverImages,intro,resourceVersions,tags'
        });
        if (lodash_1.isEmpty(resourceList)) {
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
        if (lodash_1.isEmpty(resourceVersionList)) {
            return presentables;
        }
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
            presentableInfo.resourceVersionInfo = resourceVersionList.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId);
            return presentableInfo;
        });
    }
    async relationTree(presentableInfo, presentableVersionInfo) {
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
        const untreatedResources = lodash_1.differenceBy(allUntreatedResources, resolveResources, 'resourceId');
        if (!lodash_1.isEmpty(untreatedResources)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('presentable-resolve-resource-integrity-validate-failed'), { untreatedResources });
        }
        const invalidResolveResources = lodash_1.differenceBy(resolveResources, allUntreatedResources, 'resourceId');
        if (!lodash_1.isEmpty(invalidResolveResources)) {
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
                    invalidPolicies.push(lodash_1.pick(resourceInfo, ['resourceId', 'resourceName']));
                }
            }
        }
        if (!lodash_1.isEmpty(invalidPolicies)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('params-validate-failed', 'resolveResources'), { invalidPolicies });
        }
        if (!lodash_1.isEmpty(offlineResources)) {
            throw new egg_freelog_base_1.ApplicationError(ctx.gettext('be-sign-subject-offline'), { offlineResources });
        }
    }
    /**
     * 策略校验
     * @param policies
     */
    async _validateAndCreateSubjectPolicies(policies) {
        if (lodash_1.isEmpty(policies)) {
            return [];
        }
        // 名称不允许重复
        if (lodash_1.uniqBy(policies, 'policyName').length !== policies.length) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-repeatability-validate-failed'));
        }
        const policyInfos = await this.outsideApiService.createPolicies(policies.map(x => x.policyText));
        if (policyInfos.length !== policies.length) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('subject-policy-create-failed'));
        }
        if (lodash_1.uniqBy(policyInfos, 'policyId').length !== policyInfos.length) {
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
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableAuthService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableService.prototype, "presentableProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], PresentableService.prototype, "presentableCommonChecker", void 0);
PresentableService = __decorate([
    midway_1.provide()
], PresentableService);
exports.PresentableService = PresentableService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9wcmVzZW50YWJsZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtQ0FBbUY7QUFDbkYscUNBQWtGO0FBUWxGLHVEQUUwQjtBQUMxQix3RkFBaUY7QUFHakYsSUFBYSxrQkFBa0IsR0FBL0IsTUFBYSxrQkFBa0I7SUFHM0IsR0FBRyxDQUFpQjtJQUVwQixXQUFXLENBQWU7SUFFMUIsaUJBQWlCLENBQXFCO0lBRXRDLHNCQUFzQixDQUEwQjtJQUVoRCx5QkFBeUIsQ0FBNkI7SUFFdEQsbUJBQW1CLENBQXFDO0lBRXhELHdCQUF3QixDQUEyQjtJQUVuRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE1BQWMsRUFBRSxXQUFxQjtRQUNsRSxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7WUFDckQsTUFBTSxFQUFFLHVDQUF1QyxFQUFFLEVBQUMsR0FBRyxFQUFFLFdBQVcsRUFBQztTQUN0RSxFQUFFLGlFQUFpRSxDQUFDLENBQUM7UUFDdEUsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuSSxPQUFPO2dCQUNILFVBQVU7Z0JBQ1YsWUFBWSxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxD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