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
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, versionId);
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
        presentableInfo.version = version;
        await this.presentableVersionService.createOrUpdatePresentableVersion(presentableInfo, resourceVersionId);
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
    async fillPresentablePolicyInfo(presentables) {
        if (!lodash_1.isArray(presentables) || lodash_1.isEmpty(presentables)) {
            return presentables;
        }
        const policyIds = lodash_1.chain(presentables).filter(x => lodash_1.isArray(x?.policies) && !lodash_1.isEmpty(x.policies)).map(x => x.policies.map(m => m.policyId)).flatten().uniq().value();
        if (lodash_1.isEmpty(policyIds)) {
            return presentables;
        }
        const policyMap = await this.outsideApiService.getPolicies(policyIds, egg_freelog_base_1.SubjectTypeEnum.Presentable, ['policyId', 'policyText', 'fsmDescriptionInfo']).then(list => {
            return new Map(list.map(x => [x.policyId, x]));
        });
        return presentables.map(presentable => {
            const presentableInfo = Reflect.has(presentable, 'toObject') ? presentable.toObject() : presentable;
            presentableInfo.policies.forEach(policyInfo => {
                const { policyText, fsmDescriptionInfo } = policyMap.get(policyInfo.policyId) ?? {};
                policyInfo.policyText = policyText;
                policyInfo.fsmDescriptionInfo = fsmDescriptionInfo;
            });
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
                if (!resourceInfo.policies.some(x => x.policyId === resolveContract.policyId && x.status === 1)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9wcmVzZW50YWJsZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtQ0FBbUY7QUFDbkYscUNBQWtGO0FBUWxGLHVEQU8wQjtBQUMxQix3RkFBaUY7QUFHakYsSUFBYSxrQkFBa0IsR0FBL0IsTUFBYSxrQkFBa0I7SUFpQjNCOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBaUM7UUFFckQsTUFBTSxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUMsR0FBRyxPQUFPLENBQUM7UUFFL0ksTUFBTSxLQUFLLEdBQUc7WUFDVixlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCO1lBQy9FLFFBQVEsRUFBRSxFQUFFO1lBQ1osTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1lBQ3ZCLE1BQU0sRUFBRSxRQUFRLENBQUMsV0FBVztZQUM1QixZQUFZLEVBQUUsYUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hGLFVBQVUsRUFBRSxnQ0FBeUIsQ0FBQyxPQUFPO1lBQzdDLFlBQVksRUFBRSxrQ0FBMkIsQ0FBQyxPQUFPO1NBQ3BELENBQUM7UUFFRixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVyRSxJQUFJLGdCQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBTyxDQUFDLFFBQVEsQ0FBQyxFQUFF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