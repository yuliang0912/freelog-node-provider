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
// import {NodeStatusEnum} from '../../enum';
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
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().default(2).in([1, 2, 5, 6]).toInt().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { ownerUserId: ctx.userId };
        if (lodash_1.isNumber(status)) {
            condition.status = status;
        }
        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);
    }
    async indexForAdminWithTags() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().in([0, 1, 2]).toInt().value;
        const tags = ctx.checkQuery('tags').ignoreParamWhenEmpty().toSplitArray().value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().trim().value;
        const startRegisteredDate = ctx.checkQuery('startRegisteredDate').ignoreParamWhenEmpty().toDate().value;
        const endRegisteredDate = ctx.checkQuery('endRegisteredDate').ignoreParamWhenEmpty().toDate().value;
        const projection = ctx.checkQuery('projection').ignoreParamWhenEmpty().toSplitArray().default([]).value;
        ctx.validateOfficialAuditAccount().validateParams();
        const condition = {};
        if (lodash_1.isNumber(status)) {
            condition.status = status;
        }
        if (keywords?.length) {
            const searchRegExp = new RegExp(keywords, 'i');
            condition.$or = [{ nodeName: searchRegExp }, { nodeDomain: searchRegExp }];
        }
        if (lodash_2.isDate(startRegisteredDate) && lodash_2.isDate(endRegisteredDate)) {
            condition.createDate = { $gte: startRegisteredDate, $lte: endRegisteredDate };
        }
        else if (lodash_2.isDate(startRegisteredDate)) {
            condition.createDate = { $gte: startRegisteredDate };
        }
        else if (lodash_2.isDate(endRegisteredDate)) {
            condition.createDate = { $lte: endRegisteredDate };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);
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
        if (lodash_1.isUndefined(nodeIds) && lodash_1.isUndefined(nodeDomains)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'nodeIds or nodeDomains'));
        }
        const condition = {};
        if (lodash_1.isArray(nodeIds)) {
            condition.nodeId = { $in: nodeIds };
        }
        if (lodash_1.isArray(nodeDomains)) {
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
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ([nodeDomain, nodeName].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        const condition = {};
        if (lodash_1.isString(nodeDomain)) {
            condition.nodeDomain = nodeDomain;
        }
        if (lodash_1.isString(nodeName)) {
            condition.nodeName = nodeName;
        }
        await this.nodeService.findOne(condition, projection.join(' ')).then(ctx.success);
    }
    async show() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        await this.nodeService.findById(nodeId, projection.join(' ')).then(ctx.success);
    }
    /**
     * 为节点设置标签
     */
    async setNodeTag() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().value;
        const tagNames = ctx.checkBody('tagNames').exist().isArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findOne({ nodeId });
        ctx.entityNullObjectCheck(nodeInfo);
        await this.nodeService.setTag(nodeInfo, tagNames.map(x => x.trim())).then(ctx.success);
    }
    /**
     * 取消设置标签
     */
    async unsetNodeTag() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const tagName = ctx.checkBody('tagName').exist().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findOne({ nodeId });
        ctx.entityNullObjectCheck(nodeInfo);
        await this.nodeService.unsetTag(nodeInfo, tagName).then(ctx.success);
    }
    /**
     * 冻结节点
     */
    async freezeNode() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const remark = ctx.checkBody('remark').optional().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);
        if ((nodeInfo.status & enum_1.NodeStatusEnum.Freeze) === enum_1.NodeStatusEnum.Freeze) {
            throw new egg_freelog_base_1.ArgumentError('节点已被冻结,不能重复操作');
        }
        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, remark).then(ctx.success);
    }
    /**
     * 节点解封
     */
    async deArchiveNode() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const remark = ctx.checkBody('remark').optional().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);
        if ((nodeInfo.status & enum_1.NodeStatusEnum.Freeze) !== enum_1.NodeStatusEnum.Freeze) {
            throw new egg_freelog_base_1.ArgumentError('节点未被冻结,无法进行解封操作');
        }
        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, remark).then(ctx.success);
    }
    /**
     * 节点冻结记录
     */
    async nodeFreezeRecords() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const isFilterLatest = ctx.checkQuery('isFilterLatest').optional().toBoolean().default(false).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);
        const record = await this.nodeService.findNodeFreezeRecords(nodeId);
        if (isFilterLatest) {
            return ctx.success([lodash_1.last(record.records)]);
        }
        ctx.success(record.records);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeController.prototype, "nodeCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeController.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeController.prototype, "tagService", void 0);
__decorate([
    midway_1.get('/'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "index", null);
__decorate([
    midway_1.get('/search'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "indexForAdminWithTags", null);
__decorate([
    midway_1.get('/count'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.InternalClient | egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "createdCount", null);
__decorate([
    midway_1.get('/list'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "list", null);
__decorate([
    midway_1.post('/'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "create", null);
__decorate([
    midway_1.get('/detail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "detail", null);
__decorate([
    midway_1.get('/:nodeId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "show", null);
__decorate([
    midway_1.put('/:nodeId/setTag'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "setNodeTag", null);
__decorate([
    midway_1.put('/:nodeId/unsetTag'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "unsetNodeTag", null);
__decorate([
    midway_1.put('/:nodeId/freeze'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "freezeNode", null);
__decorate([
    midway_1.put('/:nodeId/deArchive'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "deArchiveNode", null);
__decorate([
    midway_1.get('/:nodeId/freezeRecords'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "nodeFreezeRecords", null);
NodeController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/nodes')
], NodeController);
exports.NodeController = NodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLG1DQUFtRTtBQUNuRSxtQ0FBc0U7QUFDdEUsdURBQTJHO0FBQzNHLG1DQUE4QjtBQUM5QixxQ0FBMEM7QUFFMUMsNkNBQTZDO0FBSTdDLElBQWEsY0FBYyxHQUEzQixNQUFhLGNBQWM7SUFHdkIsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBQztJQUVsQixXQUFXLENBQWU7SUFFMUIsVUFBVSxDQUFlO0lBSXpCLEtBQUssQ0FBQyxLQUFLO1FBRVAsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzlFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3pGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDaEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFD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