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
        const beSignSubjects = (0, lodash_1.chain)(resolveResources).map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
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
            const beSignSubjects = (0, lodash_1.chain)(options.resolveResources).map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
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
            projection: 'resourceId,resourceName,resourceType,coverImages,intro,resourceVersions,tags'
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
PresentableService = __decorate([
    (0, midway_1.provide)()
], PresentableService);
exports.PresentableService = PresentableService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9wcmVzZW50YWJsZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtQ0FBbUY7QUFDbkYscUNBQWtGO0FBUWxGLHVEQUUwQjtBQUMxQix3RkFBaUY7QUFHakYsSUFBYSxrQkFBa0IsR0FBL0IsTUFBYSxrQkFBa0I7SUFHM0IsR0FBRyxDQUFpQjtJQUVwQixXQUFXLENBQWU7SUFFMUIsaUJBQWlCLENBQXFCO0lBRXRDLHNCQUFzQixDQUEwQjtJQUVoRCx5QkFBeUIsQ0FBNkI7SUFFdEQsbUJBQW1CLENBQXFDO0lBRXhELHdCQUF3QixDQUEyQjtJQUVuRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE1BQWMsRUFBRSxXQUFxQjtRQUNsRSxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7WUFDckQsTUFBTSxFQUFFLHVDQUF1QyxFQUFFLEVBQUMsR0FBRyxFQUFFLFdBQVcsRUFBQztTQUN0RSxFQUFFLGlFQUFpRSxDQUFDLENBQUM7UUFDdEUsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuSSxPQUFPO2dCQUNILFVBQVU7Z0JBQ1YsWUFBWSxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxD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