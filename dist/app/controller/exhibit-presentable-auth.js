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
exports.PresentableSubjectAuthController = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const auth_interface_1 = require("../../auth-interface");
const exhibit_auth_response_handler_1 = require("../../extend/auth-response-handler/exhibit-auth-response-handler");
const presentable_adapter_1 = require("../../extend/exhibit-adapter/presentable-adapter");
let PresentableSubjectAuthController = class PresentableSubjectAuthController {
    ctx;
    presentableCommonChecker;
    presentableService;
    presentableAuthService;
    presentableVersionService;
    presentableAdapter;
    exhibitAuthResponseHandler;
    /**
     * 通过展品ID获取展品
     */
    async exhibitAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subArticleIdOrName = ctx.checkQuery('subArticleIdOrName').optional().decodeURIComponent().value;
        const subArticleType = ctx.checkQuery('subArticleType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;
        if (ctx.errors.length) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const presentableInfo = await this.presentableService.findOne({ nodeId, _id: presentableId });
        await this._presentableAuthHandle(presentableInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }
    /**
     * 通过节点ID和作品ID获取展品
     */
    async exhibitAuthByNodeAndArticle() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const articleIdOrName = ctx.checkParams('articleIdOrName').exist().decodeURIComponent().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subArticleIdOrName = ctx.checkQuery('subArticleIdOrName').optional().decodeURIComponent().value;
        const subArticleType = ctx.checkQuery('subArticleType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;
        if (ctx.errors.length) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const condition = { nodeId };
        if (egg_freelog_base_1.CommonRegex.mongoObjectId.test(articleIdOrName)) {
            condition['resourceInfo.resourceId'] = articleIdOrName;
        }
        else if (egg_freelog_base_1.CommonRegex.fullResourceName.test(articleIdOrName)) {
            condition['resourceInfo.resourceName'] = articleIdOrName;
        }
        else {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const presentableInfo = await this.presentableService.findOne(condition);
        await this._presentableAuthHandle(presentableInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }
    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    async exhibitBatchAuth() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧 3:节点侧以及上游侧 4:全链路(包含用户)
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3, 4]).value;
        const exhibitIds = ctx.checkQuery('exhibitIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const presentables = await this.presentableService.find({ nodeId, _id: { $in: exhibitIds } });
        const invalidPresentableIds = (0, lodash_1.differenceWith)(exhibitIds, presentables, (x, y) => x === y.presentableId);
        if (!(0, lodash_1.isEmpty)(invalidPresentableIds)) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setData({ invalidPresentableIds }).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });
        const authFunc = authType === 1 ? this.presentableAuthService.presentableNodeSideAuth :
            authType === 2 ? this.presentableAuthService.presentableUpstreamAuth :
                authType === 3 ? this.presentableAuthService.presentableNodeSideAndUpstreamAuth :
                    authType === 4 ? this.presentableAuthService.presentableAuth : null;
        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = authFunc.call(this.presentableAuthService, presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                exhibitId: presentableInfo.presentableId,
                exhibitName: presentableInfo.presentableName,
                authCode: authResult.authCode,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                isAuth: authResult.isAuth,
                errorMsg: authResult.errorMsg
            }));
            tasks.push(task);
        }
        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }
    /**
     * 展品授权处理
     * @param presentableInfo
     * @param parentNid
     * @param subArticleName
     * @param subArticleType
     * @param subFilePath
     */
    async _presentableAuthHandle(presentableInfo, parentNid, subArticleName, subArticleType, subFilePath) {
        if (!presentableInfo) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('展品不存在,请检查参数');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const exhibitPartialInfo = {
            exhibitId: presentableInfo.presentableId,
            exhibitName: presentableInfo.presentableName
        };
        if (subFilePath && ![egg_freelog_base_1.ResourceTypeEnum.THEME, egg_freelog_base_1.ResourceTypeEnum.WIDGET].includes(presentableInfo.resourceInfo.resourceType.toLowerCase())) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数subFilePath校验失败');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult, exhibitPartialInfo);
        }
        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(lodash_1.first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        await this.exhibitAuthResponseHandler.handle(exhibitInfo, presentableAuthResult, parentNid, subArticleName, subArticleType, subFilePath);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableAuthService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_adapter_1.PresentableAdapter)
], PresentableSubjectAuthController.prototype, "presentableAdapter", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", exhibit_auth_response_handler_1.ExhibitAuthResponseHandler)
], PresentableSubjectAuthController.prototype, "exhibitAuthResponseHandler", void 0);
__decorate([
    (0, midway_1.get)('/:exhibitId/(result|info|fileStream)'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.UnLoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitAuth", null);
__decorate([
    (0, midway_1.get)('/articles/:articleIdOrName/(result|info|fileStream)'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitAuthByNodeAndArticle", null);
__decorate([
    (0, midway_1.get)('/batchAuth/results'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitBatchAuth", null);
PresentableSubjectAuthController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/auths/exhibits/:nodeId')
], PresentableSubjectAuthController);
exports.PresentableSubjectAuthController = PresentableSubjectAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1wcmVzZW50YWJsZS1hdXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL2V4aGliaXQtcHJlc2VudGFibGUtYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBc0Q7QUFDdEQsbUNBQXdEO0FBUXhELHVEQU8wQjtBQUMxQix5REFBdUQ7QUFDdkQsb0hBQTRHO0FBQzVHLDBGQUFvRjtBQUtwRixJQUFhLGdDQUFnQyxHQUE3QyxNQUFhLGdDQUFnQztJQUd6QyxHQUFHLENBQWlCO0lBRXBCLHdCQUF3QixDQUFDO0lBRXpCLGtCQUFrQixDQUFzQjtJQUV4QyxzQkFBc0IsQ0FBMEI7SUFFaEQseUJBQXlCLENBQTZCO0lBRXRELGtCQUFrQixDQUFxQjtJQUV2QywwQkFBMEIsQ0FBNkI7SUFFdkQ7O09BRUc7SUFHSCxLQUFLLENBQUMsV0FBVztRQUNiLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzNFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQy9ELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3RHLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDN0YsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUV4RixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ25CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2xILE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTthQUNyQixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN0RjtRQUNELE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFDLENBQUMsQ0FBQztRQUM1RixNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNuSCxDQUFDO0lBRUQ7O09BRUc7SUFHSCxLQUFLLENBQUMsMkJBQTJCO1FBRTdCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUM5RixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMvRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUN0RyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdGLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDeEYsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNuQixNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNsSCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07YUFDckIsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdEY7UUFFRCxNQUFNLFNBQVMsR0FBRyxFQUFDLE1BQU0sRUFBQyxDQUFDO1FBQzNCLElBQUksOEJBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ2pELFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLGVBQWUsQ0FBQztTQUMxRDthQUFNLElBQUksOEJBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDM0QsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEdBQUcsZUFBZSxDQUFDO1NBQzVEO2FBQU07WUFDSCxNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdEY7UUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekUsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbkgsQ0FBQztJQUVEOztPQUVHO0lBR0gsS0FBSyxDQUFDLGdCQUFnQjtRQUVsQixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxxQ0FBcUM7UUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNuRixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDaEgsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFDLEVBQUMsQ0FBQyxDQUFDO1FBQzFGLE1BQU0scUJBQXFCLEdBQUcsSUFBQSx1QkFBYyxFQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWhILElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMscUJBQXFCLENBQUMsRUFBRTtZQUNqQyxNQUFNLGlCQUFpQixHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMscUJBQXFCLEVBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNsSixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN6QztRQUVELE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVJLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLHdCQUF3QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZJLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDbkYsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ2xFLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO29CQUM3RSxRQUFRLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFaEYsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sZUFBZSxJQUFJLFlBQVksRUFBRTtZQUN4QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsc0JBQXNCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JBQ3RLLFNBQVMsRUFBRSxlQUFlLENBQUMsYUFBYTtnQkFDeEMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxlQUFlO2dCQUM1QyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzdCLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztnQkFDM0IscUJBQXFCLEVBQUUsVUFBVSxDQUFDLHFCQUFxQjtnQkFDdkQsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUN6QixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7YUFDaEMsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCO1FBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsc0JBQXNCLENBQUMsZUFBZ0MsRUFBRSxTQUFpQixFQUFFLGNBQXNCLEVBQUUsY0FBK0IsRUFBRSxXQUFtQjtRQUMxSixJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ2xCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDaEgsSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDdEY7UUFDRCxNQUFNLGtCQUFrQixHQUF5QjtZQUM3QyxTQUFTLEVBQUUsZUFBZSxDQUFDLGFBQWE7WUFDeEMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxlQUFlO1NBQy9DLENBQUM7UUFDRixJQUFJLFdBQVcsSUFBSSxDQUFDLENBQUMsbUNBQWdCLENBQUMsS0FBSyxFQUFFLG1DQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQVMsQ0FBQyxFQUFFO1lBQzVJLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3pILElBQUksQ0FBQywwQkFBMEIsQ0FBQywrQkFBK0IsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1NBQzFHO1FBRUQsZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQUssQ0FBQyxDQUFDO1FBQy9HLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLE9BQU8sRUFBRSx1REFBdUQsQ0FBQyxDQUFDO1FBQzlMLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsSSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsNEJBQTRCLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDbEgsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM3SSxDQUFDO0NBQ0osQ0FBQTtBQXZKRztJQURDLElBQUEsZUFBTSxHQUFFOzs2REFDVztBQUVwQjtJQURDLElBQUEsZUFBTSxHQUFFOztrRkFDZ0I7QUFFekI7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NEVBQytCO0FBRXhDO0lBREMsSUFBQSxlQUFNLEdBQUU7O2dGQUN1QztBQUVoRDtJQURDLElBQUEsZUFBTSxHQUFFOzttRkFDNkM7QUFFdEQ7SUFEQyxJQUFBLGVBQU0sR0FBRTs4QkFDVyx3Q0FBa0I7NEVBQUM7QUFFdkM7SUFEQyxJQUFBLGVBQU0sR0FBRTs4QkFDbUIsMERBQTBCO29GQUFDO0FBT3ZEO0lBRkMsSUFBQSxZQUFHLEVBQUMsc0NBQXNDLENBQUM7SUFDM0MsSUFBQSwyQ0FBd0IsRUFBQyxtQ0FBZ0IsQ0FBQyxTQUFTLEdBQUcsbUNBQWdCLENBQUMsV0FBVyxHQUFHLG1DQUFnQixDQUFDLGNBQWMsQ0FBQzs7OzttRUFrQnJIO0FBT0Q7SUFGQyxJQUFBLFlBQUcsRUFBQyxxREFBcUQsQ0FBQztJQUMxRCxJQUFBLDJDQUF3QixFQUFDLG1DQUFnQixDQUFDLFNBQVMsR0FBRyxtQ0FBZ0IsQ0FBQyxTQUFTLEdBQUcsbUNBQWdCLENBQUMsY0FBYyxDQUFDOzs7O21GQTZCbkg7QUFPRDtJQUZDLElBQUEsWUFBRyxFQUFDLG9CQUFvQixDQUFDO0lBQ3pCLElBQUEsMkNBQXdCLEVBQUMsbUNBQWdCLENBQUMsU0FBUyxDQUFDOzs7O3dFQTRDcEQ7QUE1SFEsZ0NBQWdDO0lBRjVDLElBQUEsZ0JBQU8sR0FBRTtJQUNULElBQUEsbUJBQVUsRUFBQyw0QkFBNEIsQ0FBQztHQUM1QixnQ0FBZ0MsQ0EwSjVDO0FBMUpZLDRFQUFnQyJ9