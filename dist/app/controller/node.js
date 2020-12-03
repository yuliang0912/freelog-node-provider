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
let NodeController = class NodeController {
    async index() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().value;
        const status = ctx.checkQuery('status').optional().default(0).in([0, 1, 2]).toInt().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { ownerUserId: ctx.userId };
        if (!lodash_1.isNumber(status)) {
            condition.status = status;
        }
        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);
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
    midway_1.get('/'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "index", null);
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
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "detail", null);
__decorate([
    midway_1.get('/:nodeId'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NodeController.prototype, "show", null);
NodeController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/nodes')
], NodeController);
exports.NodeController = NodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLG1DQUE4RDtBQUM5RCxtQ0FBZ0U7QUFDaEUsdURBQTJHO0FBSTNHLElBQWEsY0FBYyxHQUEzQixNQUFhLGNBQWM7SUFXdkIsS0FBSyxDQUFDLEtBQUs7UUFFUCxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDekYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDckQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMxRixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFB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