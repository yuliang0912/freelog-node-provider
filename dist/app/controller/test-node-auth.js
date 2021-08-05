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
exports.TestNodeAuthController = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
let TestNodeAuthController = class TestNodeAuthController {
    /**
     * 测试资源或者子依赖授权
     */
    async testResourceAuth() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('subjectId').isMd5().value;
        // 以下参数作为测试资源的子依赖授权,否则可以不选
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subEntityIdOrName = ctx.checkQuery('subEntityIdOrName').optional().decodeURIComponent().value;
        const subEntityType = ctx.checkQuery('subEntityType').optional().value;
        ctx.validateParams();
        const testResourceInfo = await this.testNodeService.findOneTestResource({ testResourceId });
        this.ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: this.ctx.gettext('params-validate-failed', 'testResourceId'),
        });
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResourceInfo, testResourceTreeInfo.authTree);
        await this.testResourceAuthResponseHandler.handle(testResourceInfo, testResourceTreeInfo.dependencyTree, testResourceAuthResult, parentNid, subEntityIdOrName, subEntityType);
    }
    /**
     * 测试资源批量授权
     */
    async testResourceBatchAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧  3:节点侧以及上游侧
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3]).value;
        const testResourceIds = ctx.checkQuery('testResourceIds').exist().isSplitMd5().toSplitArray().len(1, 60).value;
        ctx.validateParams();
        const testResources = await this.testNodeService.findTestResources({
            nodeId, testResourceId: { $in: testResourceIds }
        }, 'testResourceId testResourceName userId nodeId resolveResources');
        const invalidTestResourceIds = lodash_1.differenceWith(testResourceIds, testResources, (x, y) => x === y.testResourceId);
        if (!lodash_1.isEmpty(invalidTestResourceIds)) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setData({ invalidTestResourceIds }).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (lodash_1.first(testResources).userId !== this.ctx.userId) {
            return new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg(this.ctx.gettext('user-authorization-failed'));
        }
        const testResourceAuthTreeMap = await this.testNodeService.findTestResourceTreeInfos({
            nodeId, testResourceId: { $in: testResourceIds }
        }, 'testResourceId authTree').then(list => {
            return new Map(list.map(x => [x.testResourceId, x.authTree]));
        });
        const authFunc = authType === 1 ? this.testResourceAuthService.testResourceNodeSideAuth :
            authType === 2 ? this.testResourceAuthService.testResourceUpstreamAuth :
                authType === 3 ? this.testResourceAuthService.testResourceAuth : null;
        const tasks = [];
        const returnResults = [];
        for (const testResource of testResources) {
            const task = authFunc.call(this.testResourceAuthService, testResource, testResourceAuthTreeMap.get(testResource.testResourceId)).then(authResult => returnResults.push({
                testResourceId: testResource.testResourceId,
                testResourceName: testResource.testResourceName,
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
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    async nodeTestResourceAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const entityIdOrName = ctx.checkParams('entityIdOrName').exist().decodeURIComponent().value;
        const entityType = ctx.checkQuery('subEntityType').optional().in([test_node_interface_1.TestResourceOriginType.Resource, test_node_interface_1.TestResourceOriginType.Object]).value;
        // 以下参数用于测试资源的子依赖授权
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subEntityIdOrName = ctx.checkQuery('subEntityIdOrName').optional().decodeURIComponent().value;
        const subEntityType = ctx.checkQuery('subEntityType').optional().value;
        ctx.validateParams();
        const condition = { nodeId };
        if (egg_freelog_base_1.CommonRegex.mongoObjectId.test(entityIdOrName)) {
            condition['originInfo.id'] = entityIdOrName;
        }
        else if (entityIdOrName.includes('/')) {
            condition['originInfo.name'] = entityIdOrName;
        }
        else {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource(condition);
        ctx.entityNullObjectCheck(testResourceInfo);
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId: testResourceInfo.testResourceId }, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResourceInfo, testResourceTreeInfo.authTree);
        await this.testResourceAuthResponseHandler.handle(testResourceInfo, testResourceTreeInfo.dependencyTree, testResourceAuthResult, parentNid, subEntityIdOrName, subEntityType);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeAuthController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeAuthController.prototype, "testNodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeAuthController.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeAuthController.prototype, "testResourceAuthService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeAuthController.prototype, "testResourceAuthResponseHandler", void 0);
__decorate([
    midway_1.get('/:subjectId/(result|info|fileStream)', { middleware: ['authExceptionHandlerMiddleware'] }),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeAuthController.prototype, "testResourceAuth", null);
__decorate([
    midway_1.get('/nodes/:nodeId/batchAuth/result'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeAuthController.prototype, "testResourceBatchAuth", null);
__decorate([
    midway_1.get('/nodes/:nodeId/:entityIdOrName/(result|info|fileSteam)', { middleware: ['authExceptionHandlerMiddleware'] }),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeAuthController.prototype, "nodeTestResourceAuth", null);
TestNodeAuthController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/auths/testResources') // 统一URL v2/auths/:subjectType
], TestNodeAuthController);
exports.TestNodeAuthController = TestNodeAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLWF1dGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvdGVzdC1ub2RlLWF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQXdEO0FBQ3hELG1FQUltQztBQUNuQyx1REFPMEI7QUFDMUIsbUNBQXNEO0FBQ3RELHlEQUF1RDtBQUl2RCxJQUFhLHNCQUFzQixHQUFuQyxNQUFhLHNCQUFzQjtJQWEvQjs7T0FFRztJQUdILEtBQUssQ0FBQyxnQkFBZ0I7UUFFbEIsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsRSwwQkFBMEI7UUFDMUIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDcEcsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDdkUsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUMsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUMxRixJQUFJLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLGdCQUFnQixFQUFFO1lBQ2hFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFB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