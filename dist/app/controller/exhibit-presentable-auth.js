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
        const invalidPresentableIds = lodash_1.differenceWith(exhibitIds, presentables, (x, y) => x === y.presentableId);
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
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableAuthService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableSubjectAuthController.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_adapter_1.PresentableAdapter)
], PresentableSubjectAuthController.prototype, "presentableAdapter", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", exhibit_auth_response_handler_1.ExhibitAuthResponseHandler)
], PresentableSubjectAuthController.prototype, "exhibitAuthResponseHandler", void 0);
__decorate([
    midway_1.get('/:exhibitId/(result|info|fileStream)'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.UnLoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitAuth", null);
__decorate([
    midway_1.get('/articles/:articleIdOrName/(result|info|fileStream)'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitAuthByNodeAndArticle", null);
__decorate([
    midway_1.get('/batchAuth/results'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitBatchAuth", null);
PresentableSubjectAuthController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/auths/exhibits/:nodeId')
], PresentableSubjectAuthController);
exports.PresentableSubjectAuthController = PresentableSubjectAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1wcmVzZW50YWJsZS1hdXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL2V4aGliaXQtcHJlc2VudGFibGUtYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBc0Q7QUFDdEQsbUNBQXdEO0FBUXhELHVEQU8wQjtBQUMxQix5REFBdUQ7QUFDdkQsb0hBQTRHO0FBQzVHLDBGQUFvRjtBQUtwRixJQUFhLGdDQUFnQyxHQUE3QyxNQUFhLGdDQUFnQztJQUd6QyxHQUFHLENBQWlCO0lBRXBCLHdCQUF3QixDQUFDO0lBRXpCLGtCQUFrQixDQUFzQjtJQUV4QyxzQkFBc0IsQ0FBMEI7SUFFaEQseUJBQXlCLENBQTZCO0lBRXRELGtCQUFrQixDQUFxQjtJQUV2QywwQkFBMEIsQ0FBNkI7SUFFdkQ7O09BRUc7SUFHSCxLQUFLLENBQUMsV0FBVztRQUNiLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzNFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQy9ELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3RHLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FB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