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
    midway_1.controller('/v2/auths/exhibits/testResources')
], TestResourceSubjectAuthController);
exports.TestResourceSubjectAuthController = TestResourceSubjectAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1zdWJqZWN0LWF1dGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvdGVzdC1yZXNvdXJjZS1zdWJqZWN0LWF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQWtFO0FBSWxFLHVEQUcwQjtBQUMxQixtQ0FBc0Q7QUFDdEQseURBQWtGO0FBQ2xGLDhGQUF1RjtBQUN2RixvSEFBNEc7QUFNNUcsSUFBYSxpQ0FBaUMsR0FBOUMsTUFBYSxpQ0FBaUM7SUFHMUMsR0FBRyxDQUFpQjtJQUVwQixlQUFlLENBQW1CO0lBRWxDLHVCQUF1QixDQUEyQjtJQUVsRCxtQkFBbUIsQ0FBc0I7SUFFekMsMEJBQTBCLENBQTZCO0lBRXZEOztPQUVHO0lBR0gsS0FBSyxDQUFDLFdBQVc7UUFDYixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2xFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQy9ELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNoRyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN2RixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMs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