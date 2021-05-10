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
exports.ResourceAuthController = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const auth_interface_1 = require("../../auth-interface");
let ResourceAuthController = class ResourceAuthController {
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
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        if (!presentableInfo) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (presentableInfo.onlineStatus !== 1) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotOnline).setErrorMsg('标的物已下线');
            return ctx.success(subjectAuthResult);
        }
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);
        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName);
    }
    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    async presentableNodeSideAndUpstreamAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧  3:节点侧以及上游侧
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3]).value;
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const presentables = await this.presentableService.find({ nodeId, _id: { $in: presentableIds } });
        const invalidPresentableIds = lodash_1.differenceWith(presentableIds, presentables, (x, y) => x === y.presentableId);
        if (!lodash_1.isEmpty(invalidPresentableIds)) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setData({ invalidPresentableIds }).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });
        const authFunc = authType === 1 ? this.presentableAuthService.presentableNodeSideAuth :
            authType === 2 ? this.presentableAuthService.presentableUpstreamAuth :
                authType === 3 ? this.presentableAuthService.presentableNodeSideAndUpstreamAuth : null;
        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = authFunc.call(this.presentableAuthService, presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                presentableId: presentableInfo.presentableId,
                presentableName: presentableInfo.presentableName,
                referee: authResult.referee,
                authCode: authResult.authCode,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }
        await Promise.all(tasks).then(() => ctx.success(returnResults));
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
        const presentableInfo = await this.presentableService.findOne(condition);
        ctx.entityNullObjectCheck(presentableInfo);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);
        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "presentableAuthService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ResourceAuthController.prototype, "presentableAuthResponseHandler", void 0);
__decorate([
    midway_1.get('/serviceStates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResourceAuthController.prototype, "serviceStates", null);
__decorate([
    midway_1.get('/:subjectId/(result|info|resourceInfo|fileStream)', { middleware: ['authExceptionHandlerMiddleware'] }),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.UnLoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResourceAuthController.prototype, "presentableAuth", null);
__decorate([
    midway_1.get('/nodes/:nodeId/batchAuth/result'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResourceAuthController.prototype, "presentableNodeSideAndUpstreamAuth", null);
__decorate([
    midway_1.get('/nodes/:nodeId/:resourceIdOrName/(result|info|resourceInfo|fileStream)', { middleware: ['authExceptionHandlerMiddleware'] }),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResourceAuthController.prototype, "nodeResourceAuth", null);
ResourceAuthController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/auths/presentables') // 统一URL v2/auths/:subjectType/:subjectId
], ResourceAuthController);
exports.ResourceAuthController = ResourceAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9wcmVzZW50YWJsZS1hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQztBQUMvQyxtQ0FBd0Q7QUFJeEQsdURBTzBCO0FBQzFCLHlEQUF1RDtBQUl2RCxJQUFhLHNCQUFzQixHQUFuQyxNQUFhLHNCQUFzQjtJQWUvQjs7T0FFRztJQUVILEtBQUssQ0FBQyxhQUFhO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFDYixFQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDO1lBQ2pELEVBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQztTQUM1RCxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7O09BRUc7SUFHSCxLQUFLLENBQUMsZUFBZTtRQUVqQixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzNFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQy9ELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3hHLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENB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