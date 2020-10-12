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
const index_1 = require("egg-freelog-base/index");
const vistorIdentityDecorator_1 = require("../../extend/vistorIdentityDecorator");
const test_node_interface_1 = require("../../test-node-interface");
const common_regex_1 = require("egg-freelog-base/app/extend/helper/common_regex");
let TestNodeAuthController = class TestNodeAuthController {
    /**
     * 测试资源或者子依赖授权
     * @param ctx
     */
    async testResourceAuth(ctx) {
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
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     * @param ctx
     */
    async nodeTestResourceAuth(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const entityIdOrName = ctx.checkParams('entityIdOrName').exist().decodeURIComponent().value;
        const entityType = ctx.checkQuery('subEntityType').optional().in([test_node_interface_1.TestResourceOriginType.Resource, test_node_interface_1.TestResourceOriginType.Object]).value;
        // 以下参数用于测试资源的子依赖授权
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subEntityIdOrName = ctx.checkQuery('subEntityIdOrName').optional().decodeURIComponent().value;
        const subEntityType = ctx.checkQuery('subEntityType').optional().value;
        ctx.validateParams();
        const condition = { nodeId };
        if (common_regex_1.mongoObjectId.test(entityIdOrName)) {
            condition['originInfo.id'] = entityIdOrName;
        }
        else if (entityIdOrName.includes('/')) {
            condition['originInfo.name'] = entityIdOrName;
        }
        else {
            throw new index_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
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
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeAuthController.prototype, "testResourceAuth", null);
__decorate([
    midway_1.get('/nodes/:nodeId/:entityIdOrName/(result|info|fileSteam)', { middleware: ['authExceptionHandlerMiddleware'] }),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeAuthController.prototype, "nodeTestResourceAuth", null);
TestNodeAuthController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/auths/testResource') // 统一URL v2/auths/:subjectType
], TestNodeAuthController);
exports.TestNodeAuthController = TestNodeAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLWF1dGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvdGVzdC1ub2RlLWF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXdEO0FBRXhELGtEQUFnRTtBQUNoRSxrRkFBcUU7QUFDckUsbUVBQTZHO0FBQzdHLGtGQUE4RTtBQUk5RSxJQUFhLHNCQUFzQixHQUFuQyxNQUFhLHNCQUFzQjtJQWEvQjs7O09BR0c7SUFHSCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRztRQUV0QixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsRSwwQkFBMEI7UUFDMUIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDcEcsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDdkUsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUMsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUMxRixJQUFJLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLGdCQUFnQixFQUFFO1lBQ2hFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxnQkFBZ0IsQ0FBQztTQUNwRSxDQUFD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