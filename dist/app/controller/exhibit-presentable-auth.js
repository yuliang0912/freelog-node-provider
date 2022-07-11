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
const presentable_batch_auth_service_1 = require("../service/presentable-batch-auth-service");
let PresentableSubjectAuthController = class PresentableSubjectAuthController {
    ctx;
    presentableCommonChecker;
    presentableService;
    presentableVersionService;
    presentableAdapter;
    exhibitAuthResponseHandler;
    presentableBatchAuthService;
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
        return this._presentableAuthHandle(presentableInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
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
        let presentables = await this.presentableService.find({ nodeId, _id: { $in: exhibitIds } });
        const invalidPresentableIds = (0, lodash_1.differenceWith)(exhibitIds, presentables, (x, y) => x === y.presentableId);
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
        for (const exhibitId of exhibitIds) {
            const presentableInfo = presentables.find(x => x.presentableId === exhibitId);
            const authResult = authResultMap.get(exhibitId);
            returnResults.push({
                exhibitId: presentableInfo.presentableId,
                exhibitName: presentableInfo.presentableName,
                authCode: authResult.authCode,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                isAuth: authResult.isAuth,
                errorMsg: authResult.errorMsg
            });
        }
        ctx.success(returnResults);
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
        // const exhibitPartialInfo: Partial<ExhibitInfo> = {
        //     exhibitId: presentableInfo.presentableId,
        //     exhibitName: presentableInfo.presentableName
        // };
        // if (subFilePath) { // 之前校验了必须主题和插件才能传递subFilePath参数,由于资源类型的调整,暂时去掉此限制
        //     const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数subFilePath校验失败');
        //     this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult, exhibitPartialInfo);
        // }
        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(lodash_1.first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableBatchAuthService.batchPresentableAuth([presentableInfo], new Map([[presentableInfo.presentableId, presentableVersionInfo.authTree]]), 4).then(results => {
            return results.get(presentableInfo.presentableId);
        });
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        return this.exhibitAuthResponseHandler.handle(exhibitInfo, presentableAuthResult, parentNid, subArticleName, subArticleType, subFilePath);
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
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_batch_auth_service_1.PresentableBatchAuthService)
], PresentableSubjectAuthController.prototype, "presentableBatchAuthService", void 0);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableSubjectAuthController.prototype, "exhibitBatchAuth", null);
PresentableSubjectAuthController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/auths/exhibits/:nodeId')
], PresentableSubjectAuthController);
exports.PresentableSubjectAuthController = PresentableSubjectAuthController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1wcmVzZW50YWJsZS1hdXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL2V4aGliaXQtcHJlc2VudGFibGUtYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBc0Q7QUFDdEQsbUNBQXdEO0FBTXhELHVEQU0wQjtBQUMxQix5REFBdUQ7QUFDdkQsb0hBQTRHO0FBQzVHLDBGQUFvRjtBQUVwRiw4RkFBc0Y7QUFJdEYsSUFBYSxnQ0FBZ0MsR0FBN0MsTUFBYSxnQ0FBZ0M7SUFHekMsR0FBRyxDQUFpQjtJQUVwQix3QkFBd0IsQ0FBQztJQUV6QixrQkFBa0IsQ0FBc0I7SUFFeEMseUJBQXlCLENBQTZCO0lBRXRELGtCQUFrQixDQUFxQjtJQUV2QywwQkFBMEIsQ0FBNkI7SUFFdkQsMkJBQTJCLENBQThCO0lBRXpEOztPQUVHO0lBR0gsS0FBSyxDQUFDLFdBQVc7UUFDYixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMvRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUN0RyxNQUFNLGNBQWMs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