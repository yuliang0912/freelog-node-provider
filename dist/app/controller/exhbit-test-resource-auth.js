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
exports.TestResourceSubjectAuthController = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const test_resource_adapter_1 = require("../../extend/exhibit-adapter/test-resource-adapter");
const exhibit_auth_response_handler_1 = require("../../extend/auth-response-handler/exhibit-auth-response-handler");
let TestResourceSubjectAuthController = class TestResourceSubjectAuthController {
    ctx;
    testNodeService;
    testResourceAuthService;
    testResourceAdapter;
    exhibitAuthResponseHandler;
    /**
     * 通过展品ID获取展品
     */
    async exhibitAuth() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('exhibitId').isMd5().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subWorkIdOrName = ctx.checkQuery('subWorkIdOrName').optional().decodeURIComponent().value;
        const subWorkType = ctx.checkQuery('subWorkType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;
        if (ctx.errors.length) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource({ testResourceId });
        await this._testResourceAuthHandle(testResourceInfo, parentNid, subWorkIdOrName, subWorkType, subFilePath);
    }
    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    async exhibitAuthByNodeAndWork() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const workIdOrName = ctx.checkParams('workIdOrName').exist().decodeURIComponent().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subWorkIdOrName = ctx.checkQuery('subWorkIdOrName').optional().decodeURIComponent().value;
        const subWorkType = ctx.checkQuery('subWorkType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;
        if (ctx.errors.length) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const condition = { nodeId };
        if (egg_freelog_base_1.CommonRegex.mongoObjectId.test(workIdOrName)) {
            condition['originInfo.id'] = workIdOrName;
        }
        else if (workIdOrName.includes('/')) {
            condition['originInfo.name'] = workIdOrName;
        }
        else {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数workIdOrName校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource(condition);
        await this._testResourceAuthHandle(testResourceInfo, parentNid, subWorkIdOrName, subWorkType, subFilePath);
    }
    /**
     * 测试资源批量授权
     */
    async testResourceBatchAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧  3:节点侧以及上游侧
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3]).value;
        const testResourceIds = ctx.checkQuery('exhibitIds').exist().isSplitMd5().toSplitArray().len(1, 60).value;
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
                exhibitId: testResource.testResourceId,
                exhibitName: testResource.testResourceName,
                authCode: authResult.authCode,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }
        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }
    /**
     * 测试展品授权处理
     * @param testResource
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     * @param subFilePath
     */
    async _testResourceAuthHandle(testResource, parentNid, subWorkIdOrName, subWorkType, subFilePath) {
        if (!testResource) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('展品不存在,请检查参数');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        if (testResource.userId !== this.ctx.userId) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.LoginUserUnauthorized).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser).setErrorMsg('当前用户没有测试权限');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const exhibitPartialInfo = {
            exhibitId: testResource.testResourceId,
            exhibitName: testResource.testResourceName
        };
        if (subFilePath && ![egg_freelog_base_1.ResourceTypeEnum.THEME, egg_freelog_base_1.ResourceTypeEnum.WIDGET].includes(testResource.originInfo.resourceType.toLowerCase())) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数subFilePath校验失败');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult, exhibitPartialInfo);
        }
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId: testResource.testResourceId }, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResource, testResourceTreeInfo.authTree);
        const exhibitInfo = this.testResourceAdapter.testResourceWrapToExhibitInfo(testResource, testResourceTreeInfo);
        await this.exhibitAuthResponseHandler.handle(exhibitInfo, testResourceAuthResult, parentNid, subWorkIdOrName, subWorkType, subFilePath);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceSubjectAuthController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceSubjectAuthController.prototype, "testNodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceSubjectAuthController.prototype, "testResourceAuthService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", test_resource_adapter_1.TestResourceAdapter)
], TestResourceSubjectAuthController.prototype, "testResourceAdapter", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", exhibit_auth_response_handler_1.ExhibitAuthResponseHandler)
], TestResourceSubjectAuthController.prototype, "exhibitAuthResponseHandler", void 0);
__decorate([
    midway_1.get('/:exhibitId/(result|info|fileStream)'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.UnLoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestResourceSubjectAuthController.prototype, "exhibitAuth", null);
__decorate([
    midway_1.get('/:nodeId/:workIdOrName/(result|info|fileStream)'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestResourceSubjectAuthController.prototype, "exhibitAuthByNodeAndWork", null);
__decorate([
    midway_1.get('/:nodeId/batchAuth/results'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestResourceSubjectAuthController.prototype, "testResourceBatchAuth", null);
TestResourceSubjectAuthController = __decorate([
    midway_1.provide(),
    midway_1.priority(1),
    midway_1.controller('/v2/auths/exhibits/test')
], TestResourceSubjectAuthController);
exports.TestResourceSubjectAuthController = TestResourceSubjectAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoYml0LXRlc3QtcmVzb3VyY2UtYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9leGhiaXQtdGVzdC1yZXNvdXJjZS1hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLG1DQUFrRTtBQUlsRSx1REFHMEI7QUFDMUIsbUNBQXNEO0FBQ3RELHlEQUFrRjtBQUNsRiw4RkFBdUY7QUFDdkYsb0hBQTRHO0FBTTVHLElBQWEsaUNBQWlDLEdBQTlDLE1BQWEsaUNBQWlDO0lBRzFDLEdBQUcsQ0FBaUI7SUFFcEIsZUFBZSxDQUFtQjtJQUVsQyx1QkFBdUIsQ0FBMkI7SUFFbEQsbUJBQW1CLENBQXNCO0lBRXpDLDBCQUEwQixDQUE2QjtJQUV2RDs7T0FFRztJQUdILEtBQUssQ0FBQyxXQUFXO1FBQ2IsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMvRCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDaEcsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdkYsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUV4RixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ25CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2xILE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTthQUNyQixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN0RjtRQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUMsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUMxRixNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUMvRyxDQUFDO0lBRUQ7O09BRUc7SUFHSCxLQUFLLENBQUMsd0JBQXdCO1FBRTFCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDeEYsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDL0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2hHLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZGLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFFeEYsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNuQixNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNsSCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07YUFDckIsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdEY7UUFDRCxNQUFNLFNBQVMsR0FBUSxFQUFDLE1BQU0sRUFBQyxDQUFDO1FBQ2hDLElBQUksOEJBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQzlDLFNBQVMsQ0FBQyxlQUFlLENBQUMsR0FBRyxZQUFZLENBQUM7U0FDN0M7YUFBTSxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsWUFBWSxDQUFDO1NBQy9DO2FBQU07WUFDSCxNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQzlILE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTthQUNyQixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN0RjtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQy9HLENBQUM7SUFFRDs7T0FFRztJQUdILEtBQUssQ0FBQyxxQkFBcUI7UUFDdkIsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsMEJBQTBCO1FBQzFCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNoRixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzFHLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUM7WUFDL0QsTUFBTSxFQUFFLGNBQWMsRUFBRSxFQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUM7U0FDakQsRUFBRSxnRUFBZ0UsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sc0JBQXNCLEdBQUcsdUJBQWMsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN4SCxJQUFJLENBQUMsZ0JBQU8sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQ2xDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBQyxzQkFBc0IsRUFBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ25KLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsSUFBSSxjQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ2pELE9BQU8sSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7U0FDdEk7UUFFRCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQztZQUNqRixNQUFNLEVBQUUsY0FBYyxFQUFFLEVBQUMsR0FBRyxFQUFFLGVBQWUsRUFBQztTQUNqRCxFQUFFLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDckYsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQ3BFLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTlFLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNqQixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDdEMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsWUFBWSxFQUFFLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNuSyxTQUFTLEVBQUUsWUFBWSxDQUFDLGNBQWM7Z0JBQ3RDLFdBQVcsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO2dCQUMxQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzdCLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztnQkFDM0IscUJBQXFCLEVBQUUsVUFBVSxDQUFDLHFCQUFxQjtnQkFDdkQsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUN6QixLQUFLLEVBQUUsVUFBVSxDQUFDLFFBQVE7YUFDN0IsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCO1FBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUMsWUFBOEIsRUFBRSxTQUFpQixFQUFFLGVBQXVCLEVBQUUsV0FBeUIsRUFBRSxXQUFtQjtRQUNwSixJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2YsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNoSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN0RjtRQUNELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUN6QyxNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBeUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDcEwsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdEY7UUFDRCxNQUFNLGtCQUFrQixHQUF5QjtZQUM3QyxTQUFTLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDdEMsV0FBVyxFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7U0FDN0MsQ0FBQztRQUNGLElBQUksV0FBVyxJQUFJLENBQUMsQ0FBQyxtQ0FBZ0IsQ0FBQyxLQUFLLEVBQUUsbUNBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBUyxDQUFDLEVBQUU7WUFDdkksTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDekgsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUM7U0FDMUc7UUFFRCxNQUFNLG9CQUFvQixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxFQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYyxFQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUM5SixNQUFNLHNCQUFzQixHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVoSSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDL0csTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM1SSxDQUFDO0NBQ0osQ0FBQTtBQTNKRztJQURDLGVBQU0sRUFBRTs7OERBQ1c7QUFFcEI7SUFEQyxlQUFNLEVBQUU7OzBFQUN5QjtBQUVsQztJQURDLGVBQU0sRUFBRTs7a0ZBQ3lDO0FBRWxEO0lBREMsZUFBTSxFQUFFOzhCQUNZLDJDQUFtQjs4RUFBQztBQUV6QztJQURDLGVBQU0sRUFBRTs4QkFDbUIsMERBQTBCO3FGQUFDO0FBT3ZEO0lBRkMsWUFBRyxDQUFDLHNDQUFzQyxDQUFDO0lBQzNDLDJDQUF3QixDQUFDLG1DQUFnQixDQUFDLFNBQVMsR0FBRyxtQ0FBZ0IsQ0FBQyxXQUFXLEdBQUcsbUNBQWdCLENBQUMsY0FBYyxDQUFDOzs7O29FQWlCckg7QUFPRDtJQUZDLFlBQUcsQ0FBQyxpREFBaUQsQ0FBQztJQUN0RCwyQ0FBd0IsQ0FBQyxtQ0FBZ0IsQ0FBQyxTQUFTLENBQUM7Ozs7aUZBK0JwRDtBQU9EO0lBRkMsWUFBRyxDQUFDLDRCQUE0QixDQUFDO0lBQ2pDLDJDQUF3QixDQUFDLG1DQUFnQixDQUFDLFNBQVMsQ0FBQzs7Ozs4RUErQ3BEO0FBNUhRLGlDQUFpQztJQUg3QyxnQkFBTyxFQUFFO0lBQ1QsaUJBQVEsQ0FBQyxDQUFDLENBQUM7SUFDWCxtQkFBVSxDQUFDLHlCQUF5QixDQUFDO0dBQ3pCLGlDQUFpQyxDQThKN0M7QUE5SlksOEVBQWlDIn0=