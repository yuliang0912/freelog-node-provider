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
exports.PresentableAuthController = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const auth_interface_1 = require("../../auth-interface");
const presentable_batch_auth_service_1 = require("../service/presentable-batch-auth-service");
let PresentableAuthController = class PresentableAuthController {
    ctx;
    presentableCommonChecker;
    presentableService;
    presentableBatchAuthService;
    presentableVersionService;
    presentableAuthResponseHandler;
    /**
     * 展品服务的色块(目前此接口未使用,网关层面通过已通过mock实现)
     */
    async serviceStates() {
        this.ctx.success([
            { name: 'active', type: 'authorization', value: 1 },
            { name: 'testActive', type: 'testAuthorization', value: 2 }
        ]);
    }
    /**
     * 通过展品ID获取展品并且授权
     */
    async presentableAuth() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('subjectId').isPresentableId().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        const subResourceFile = ctx.checkQuery('subResourceFile').optional().decodeURIComponent().value;
        ctx.validateParams();
        let presentableInfo = await this.presentableService.findById(presentableId);
        if (!presentableInfo) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (presentableInfo.onlineStatus !== 1) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotOnline).setErrorMsg('标的物已下线');
            return ctx.success(subjectAuthResult);
        }
        if (subResourceFile) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'subResourceFile'));
        }
        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(lodash_1.first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableBatchAuthService.batchPresentableAuth([presentableInfo], new Map([[presentableInfo.presentableId, presentableVersionInfo.authTree]]), 4).then(results => {
            return results.get(presentableInfo.presentableId);
        });
        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName, subResourceFile);
    }
    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    async presentableBatchAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧  2:上游侧  3:节点侧以及上游侧 4:全链路(包含用户)
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3, 4]).value;
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const presentables = await this.presentableService.find({ nodeId, _id: { $in: presentableIds } });
        const invalidPresentableIds = (0, lodash_1.differenceWith)(presentableIds, presentables, (x, y) => x === y.presentableId);
        if (!(0, lodash_1.isEmpty)(invalidPresentableIds)) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setData({ invalidPresentableIds }).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });
        const returnResults = [];
        const authResultMap = await this.presentableBatchAuthService.batchPresentableAuth(presentables, presentableAuthTreeMap, authType);
        for (const presentableId of presentableIds) {
            const presentableInfo = presentables.find(x => x.presentableId === presentableId);
            const authResult = authResultMap.get(presentableId);
            returnResults.push({
                presentableId: presentableInfo.presentableId,
                presentableName: presentableInfo.presentableName,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                authCode: authResult.authCode,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            });
        }
        ctx.success(returnResults);
    }
    /**
     * 通过节点ID和资源ID获取展品,并且授权
     */
    async nodeResourceAuth() {
        const { ctx } = this;
        const resourceIdOrName = ctx.checkParams('resourceIdOrName').exist().decodeURIComponent().value;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        const subResourceFile = ctx.checkQuery('subResourceFile').optional().decodeURIComponent().value;
        ctx.validateParams();
        const condition = { nodeId };
        if (egg_freelog_base_1.CommonRegex.mongoObjectId.test(resourceIdOrName)) {
            condition['resourceInfo.resourceId'] = resourceIdOrName;
        }
        else if (egg_freelog_base_1.CommonRegex.fullResourceName.test(resourceIdOrName)) {
            condition['resourceInfo.resourceName'] = resourceIdOrName;
        }
        else {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }
        let presentableInfo = await this.presentableService.findOne(condition);
        if (!presentableInfo) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (presentableInfo.onlineStatus !== 1) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotOnline).setErrorMsg('标的物已下线');
            return ctx.success(subjectAuthResult);
        }
        if (subResourceFile) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'subResourceFile'));
        }
        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(lodash_1.first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableBatchAuthService.batchPresentableAuth([presentableInfo], new Map([[presentableInfo.presentableId, presentableVersionInfo.authTree]]), 4).then(results => {
            return results.get(presentableInfo.presentableId);
        });
        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName, subResourceFile);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthController.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthController.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_batch_auth_service_1.PresentableBatchAuthService)
], PresentableAuthController.prototype, "presentableBatchAuthService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthController.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthController.prototype, "presentableAuthResponseHandler", void 0);
__decorate([
    (0, midway_1.get)('/serviceStates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableAuthController.prototype, "serviceStates", null);
__decorate([
    (0, midway_1.get)('/:subjectId/(result|info|resourceInfo|fileStream)', { middleware: ['authExceptionHandlerMiddleware'] }),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.UnLoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableAuthController.prototype, "presentableAuth", null);
__decorate([
    (0, midway_1.get)('/nodes/:nodeId/batchAuth/result'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableAuthController.prototype, "presentableBatchAuth", null);
__decorate([
    (0, midway_1.get)('/nodes/:nodeId/:resourceIdOrName/(result|info|resourceInfo|fileStream)', { middleware: ['authExceptionHandlerMiddleware'] }),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableAuthController.prototype, "nodeResourceAuth", null);
PresentableAuthController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/auths/presentables') // 统一URL v2/auths/:subjectTypes/:subjectId
], PresentableAuthController);
exports.PresentableAuthController = PresentableAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9wcmVzZW50YWJsZS1hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUFzRDtBQUN0RCxtQ0FBd0Q7QUFJeEQsdURBTzBCO0FBQzFCLHlEQUF1RDtBQUN2RCw4RkFBc0Y7QUFJdEYsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFHbEMsR0FBRyxDQUFpQjtJQUVwQix3QkFBd0IsQ0FBQztJQUV6QixrQkFBa0IsQ0FBc0I7SUFFeEMsMkJBQTJCLENBQThCO0lBRXpELHlCQUF5QixDQUE2QjtJQUV0RCw4QkFBOEIsQ0FBa0M7SUFFaEU7O09BRUc7SUFFSCxLQUFLLENBQUMsYUFBYTtRQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO1lBQ2IsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQztZQUNqRCxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUM7U0FDNUQsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOztPQUVHO0lBR0gsS0FBSyxDQUFDLGVBQWU7UUFFakIsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMvRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFR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