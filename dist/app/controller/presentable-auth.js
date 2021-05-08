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
        ctx.entityNullObjectCheck(presentableInfo);
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
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'presentableIds'), { invalidPresentableIds });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9wcmVzZW50YWJsZS1hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQztBQUMvQyxtQ0FBd0Q7QUFJeEQsdURBQXdIO0FBSXhILElBQWEsc0JBQXNCLEdBQW5DLE1BQWEsc0JBQXNCO0lBZS9COztPQUVHO0lBRUgsS0FBSyxDQUFDLGFBQWE7UUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztZQUNiLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUM7WUFDakQsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDO1NBQzVELENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7T0FFRztJQUdILEtBQUssQ0FBQyxlQUFlO1FBRWpCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDM0UsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDL0QsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDeEcsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMs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