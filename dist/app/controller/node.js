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
exports.NodeController = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const lodash_2 = require("lodash");
const enum_1 = require("../../enum");
let NodeController = class NodeController {
    ctx;
    nodeCommonChecker;
    nodeService;
    tagService;
    async index() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().toInt().in([1, 2, 5, 6]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { ownerUserId: ctx.userId };
        if ((0, lodash_1.isNumber)(status)) {
            condition.status = status;
        }
        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);
    }
    async indexForAdmin() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().in([0, 1]).toInt().value;
        const tags = ctx.checkQuery('tags').ignoreParamWhenEmpty().toSplitArray().value;
        const ownerUserId = ctx.checkQuery('ownerUserId').ignoreParamWhenEmpty().toInt().gt(0).value;
        const nodeId = ctx.checkQuery('nodeId').ignoreParamWhenEmpty().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().trim().value;
        const startCreateDate = ctx.checkQuery('startCreateDate').ignoreParamWhenEmpty().toDate().value;
        const endCreateDate = ctx.checkQuery('endCreateDate').ignoreParamWhenEmpty().toDate().value;
        const projection = ctx.checkQuery('projection').ignoreParamWhenEmpty().toSplitArray().default([]).value;
        ctx.validateOfficialAuditAccount().validateParams();
        const condition = {};
        if (status === 0) {
            condition.status = { $in: [1, 2] };
        }
        else if (status === 2) {
            condition.status = { $in: [4, 5, 6] };
        }
        if (keywords?.length) {
            const searchRegExp = new RegExp(keywords, 'i');
            condition.$or = [{ nodeName: searchRegExp }, { nodeDomain: searchRegExp }, { ownerUserName: searchRegExp }];
        }
        if ((0, lodash_2.isDate)(startCreateDate) && (0, lodash_2.isDate)(endCreateDate)) {
            condition.createDate = { $gte: startCreateDate, $lte: endCreateDate };
        }
        else if ((0, lodash_2.isDate)(startCreateDate)) {
            condition.createDate = { $gte: startCreateDate };
        }
        else if ((0, lodash_2.isDate)(endCreateDate)) {
            condition.createDate = { $lte: endCreateDate };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if (ownerUserId) {
            condition.ownerUserId = ownerUserId;
        }
        if (nodeId) {
            condition.nodeId = nodeId;
        }
        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort ?? { createDate: -1 }).then(ctx.success);
        // const tagMap = await this.tagService.find({status: 0}).then(list => {
        //     return new Map(list.map(x => [x.tagId.toString(), pick(x, ['tagId', 'tag'])]));
        // });
        //
        // const list = [];
        // for (const nodeInfo of pageResult.dataList) {
        //     if (isArray(nodeInfo['nodeDetails']) && nodeInfo['nodeDetails'].length) {
        //         const nodeDetail = first<NodeDetailInfo>(nodeInfo['nodeDetails']);
        //         nodeInfo['statusChangeRemark'] = nodeDetail.statusChangeRemark ?? '';
        //     } else {
        //         nodeInfo['tags'] = [];
        //         nodeInfo['statusChangeRemark'] = '';
        //     }
        //     list.push(omit(nodeInfo, ['_id', 'nodeDetails', 'uniqueKey']));
        // }
        // pageResult.dataList = list;
        // return ctx.success(pageResult);
    }
    async createdCount() {
        const { ctx } = this;
        const userIds = ctx.checkQuery('userIds').exist().isSplitNumber().toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const list = await this.nodeService.findUserCreatedNodeCounts(userIds.map(x => parseInt(x)));
        ctx.success(userIds.map(userId => {
            const record = list.find(x => x.userId.toString() === userId);
            return { userId: parseInt(userId), createdNodeCount: record?.count ?? 0 };
        }));
    }
    async list() {
        const { ctx } = this;
        const nodeIds = ctx.checkQuery('nodeIds').optional().isSplitNumber().toSplitArray().len(1, 100).value;
        const nodeDomains = ctx.checkQuery('nodeDomains').optional().toSplitArray().len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ((0, lodash_1.isUndefined)(nodeIds) && (0, lodash_1.isUndefined)(nodeDomains)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'nodeIds or nodeDomains'));
        }
        const condition = {};
        if ((0, lodash_1.isArray)(nodeIds)) {
            condition.nodeId = { $in: nodeIds };
        }
        if ((0, lodash_1.isArray)(nodeDomains)) {
            condition.nodeDomain = { $in: nodeDomains };
        }
        await this.nodeService.find(condition, projection.join(' ')).then(ctx.success);
    }
    async create() {
        const { ctx } = this;
        const nodeName = ctx.checkBody('nodeName').exist().type('string').isNodeName().value;
        const nodeDomain = ctx.checkBody('nodeDomain').exist().type('string').isNodeDomain().toLowercase().value;
        ctx.validateParams();
        await this.nodeCommonChecker.checkRegisterNodeDomainAndName(nodeDomain, nodeName);
        await this.nodeCommonChecker.checkNodeCreatedLimit();
        await this.nodeService.createNode({ nodeName, nodeDomain }).then(ctx.success);
    }
    async detail() {
        const { ctx } = this;
        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value;
        const nodeName = ctx.checkQuery('nodeName').optional().isNodeName().value;
        const isLoadOwnerUserInfo = ctx.checkQuery('isLoadOwnerUserInfo').optional().toInt().in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ([nodeDomain, nodeName].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        const condition = {};
        if ((0, lodash_1.isString)(nodeDomain)) {
            condition.nodeDomain = nodeDomain;
        }
        if ((0, lodash_1.isString)(nodeName)) {
            condition.nodeName = nodeName;
        }
        let nodeInfo = await this.nodeService.findOne(condition, projection.join(' '));
        nodeInfo = await this.nodeService.fillNodeFreezeReason([nodeInfo]).then(lodash_1.first);
        if (isLoadOwnerUserInfo) {
            nodeInfo = await this.nodeService.fillNodeOwnerUserInfo([nodeInfo]).then(lodash_1.first);
        }
        ctx.success(nodeInfo);
    }
    async show() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const isLoadOwnerUserInfo = ctx.checkQuery('isLoadOwnerUserInfo').optional().toInt().in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        let nodeInfo = await this.nodeService.findById(nodeId, projection.join(' '));
        nodeInfo = await this.nodeService.fillNodeFreezeReason([nodeInfo]).then(lodash_1.first);
        if (isLoadOwnerUserInfo) {
            nodeInfo = await this.nodeService.fillNodeOwnerUserInfo([nodeInfo]).then(lodash_1.first);
        }
        ctx.success(nodeInfo);
    }
    // 批量设置或移除节点标签
    async batchSetOrRemoveNodeTag() {
        const { ctx } = this;
        const nodeIds = ctx.checkBody('nodeIds').exist().isArray().value;
        const tagNames = ctx.checkBody('tagNames').exist().isArray().len(1, 100).value;
        const setType = ctx.checkBody('setType').exist().toInt().in([1, 2]).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const tagList = await this.tagService.find({ tagName: { $in: tagNames } });
        if (!tagList.length) {
            return ctx.success(false);
        }
        await this.nodeService.batchSetOrRemoveNodeTags(nodeIds, tagList.map(x => x.tagName), setType).then(ctx.success);
    }
    /**
     * 冻结节点
     */
    async freezeNode() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const reason = ctx.checkBody('reason').optional().len(1, 200).value;
        const remark = ctx.checkBody('remark').optional().len(1, 200).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);
        if ((nodeInfo.status & enum_1.NodeStatusEnum.Freeze) === enum_1.NodeStatusEnum.Freeze) {
            throw new egg_freelog_base_1.ArgumentError('节点已被冻结,不能重复操作');
        }
        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, reason, remark).then(ctx.success);
    }
    /**
     * 节点解封
     */
    async deArchiveNode() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const reason = ctx.checkBody('reason').optional().len(1, 200).value;
        const remark = ctx.checkBody('remark').optional().len(1, 200).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);
        if ((nodeInfo.status & enum_1.NodeStatusEnum.Freeze) !== enum_1.NodeStatusEnum.Freeze) {
            throw new egg_freelog_base_1.ArgumentError('节点未被冻结,无法进行解封操作');
        }
        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, reason, remark).then(ctx.success);
    }
    /**
     * 节点冻结记录
     */
    async nodeFreezeRecords() {
        const { ctx } = this;
        const nodeIds = ctx.checkQuery('nodeIds').exist().isSplitNumber().toSplitArray().len(1, 100).value;
        const recordDesc = ctx.checkQuery('remark').optional().default(1).toInt().in([0, 1]).value;
        const recordLimit = ctx.checkQuery('recordLimit').ignoreParamWhenEmpty().toInt().default(10).gt(0).le(100).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const dataList = await this.nodeService.batchFindFreeOrRecoverRecords(nodeIds.map(x => parseInt(x)), undefined, recordLimit);
        if (recordDesc) {
            dataList.forEach(x => x.records.reverse());
        }
        ctx.success(dataList);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeController.prototype, "nodeCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeController.prototype, "nodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeController.prototype, "tagService", void 0);
__decorate([
    (0, midway_1.get)('/'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "index", null);
__decorate([
    (0, midway_1.get)('/search'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "indexForAdmin", null);
__decorate([
    (0, midway_1.get)('/count'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.InternalClient | egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "createdCount", null);
__decorate([
    (0, midway_1.get)('/list'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "list", null);
__decorate([
    (0, midway_1.post)('/'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "create", null);
__decorate([
    (0, midway_1.get)('/detail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "detail", null);
__decorate([
    (0, midway_1.get)('/:nodeId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "show", null);
__decorate([
    (0, midway_1.put)('/batchSetOrRemoveNodeTag'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "batchSetOrRemoveNodeTag", null);
__decorate([
    (0, midway_1.put)('/:nodeId/freeze'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "freezeNode", null);
__decorate([
    (0, midway_1.put)('/:nodeId/deArchive'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "deArchiveNode", null);
__decorate([
    (0, midway_1.get)('/freeOrRecover/records'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "nodeFreezeRecords", null);
NodeController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/nodes')
], NodeController);
exports.NodeController = NodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLG1DQUFtRTtBQUNuRSxtQ0FBdUU7QUFDdkUsdURBQTJHO0FBQzNHLG1DQUE4QjtBQUM5QixxQ0FBMEM7QUFJMUMsSUFBYSxjQUFjLEdBQTNCLE1BQWEsY0FBYztJQUd2QixHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFDO0lBRWxCLFdBQVcsQ0FBZTtJQUUxQixVQUFVLENBQWU7SUFJekIsS0FBSyxDQUFDLEtBQUs7UUFFUCxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDekYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNoRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVB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