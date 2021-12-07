import {controller, inject, get, provide} from 'midway';
import {first, isArray, isEmpty, isString, isUndefined} from 'lodash';
import {
    ExhibitInfo, INodeService, IOutsideApiService, IPresentableService,
    IPresentableVersionService, PresentableVersionInfo
} from '../../interface';
import {ArgumentError, FreelogContext, IdentityTypeEnum, PageResult, visitorIdentityValidator} from 'egg-freelog-base';
import {PresentableCommonChecker} from '../../extend/presentable-common-checker';
import {PresentableAdapter} from '../../extend/exhibit-adapter/presentable-adapter';
import {ITestNodeService, TestResourceOriginType} from '../../test-node-interface';
import {TestResourceAdapter} from '../../extend/exhibit-adapter/test-resource-adapter';
import {ArticleTypeEnum} from '../../enum';

@provide()
@controller('/v2/exhibits/:nodeId')
export class ExhibitController {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableCommonChecker: PresentableCommonChecker;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableAdapter: PresentableAdapter;
    @inject()
    testResourceAdapter: TestResourceAdapter;
    @inject()
    testNodeService: ITestNodeService;
    @inject()
    nodeService: INodeService;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 批量查询展品
     */
    @get('/list')
    async exhibitList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('exhibitIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const articleIds = ctx.checkQuery('articleIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (presentableIds) {
            condition._id = {$in: presentableIds};
        }
        if (articleIds) {
            condition['resourceInfo.resourceId'] = {$in: articleIds};
        }
        if (!articleIds && !presentableIds) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'));
        }

        let presentableVersionPropertyMap = new Map<string, PresentableVersionInfo>();
        let presentableList = await this.presentableService.find(condition, projection.join(' '));
        if (isLoadPolicyInfo) {
            presentableList = await this.presentableService.fillPresentablePolicyInfo(presentableList, isTranslate);
        }
        if (isLoadVersionProperty) {
            const presentableVersionIds = presentableList.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            presentableVersionPropertyMap = await this.presentableVersionService.find({presentableVersionId: {$in: presentableVersionIds}}, 'presentableId versionProperty').then(list => {
                return new Map(list.map(x => [x.presentableId, x]));
            });
        }
        const exhibitList = presentableList.map(item => this.presentableAdapter.presentableWrapToExhibitInfo(item, presentableVersionPropertyMap.get(item.presentableId)));
        ctx.success(exhibitList);
    }

    /**
     * 正式节点的展品
     */
    @get('/')
    async exhibits() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const articleResourceTypes = ctx.checkQuery('articleResourceTypes').optional().toSplitArray().value;
        const omitArticleResourceType = ctx.checkQuery('omitArticleResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (articleResourceTypes?.length) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = {$in: articleResourceTypes};
        } else if (isString(omitArticleResourceType)) {
            condition['resourceInfo.resourceType'] = {$ne: omitArticleResourceType};
        }
        if (tags) {
            condition.tags = {$in: tags};
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if (isString(keywords)) {
            const searchExp = {$regex: keywords, $options: 'i'};
            condition.$or = [{presentableName: searchExp}, {presentableTitle: searchExp}, {'resourceInfo.resourceName': searchExp}];
        }

        let presentableVersionPropertyMap = new Map<string, PresentableVersionInfo>();
        const pageResult = await this.presentableService.findIntervalList(condition, skip, limit, projection, sort);
        if (isLoadPolicyInfo) {
            pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList, isTranslate);
        }
        if (isLoadVersionProperty) {
            const presentableVersionIds = pageResult.dataList.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            presentableVersionPropertyMap = await this.presentableVersionService.find({presentableVersionId: {$in: presentableVersionIds}}, 'presentableId versionProperty').then(list => {
                return new Map(list.map(x => [x.presentableId, x]));
            });
        }

        const exhibitPageResult: PageResult<ExhibitInfo> = {
            skip: pageResult.skip,
            limit: pageResult.limit,
            totalItem: pageResult.totalItem,
            dataList: []
        };
        for (const item of pageResult.dataList) {
            exhibitPageResult.dataList.push(this.presentableAdapter.presentableWrapToExhibitInfo(item, presentableVersionPropertyMap.get(item.presentableId)));
        }
        return ctx.success(exhibitPageResult);
    }

    /**
     * 获取作品信息
     */
    @get('/articles/list')
    async articles() {
        const {ctx} = this;
        // const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        // const articleIds = ctx.checkQuery('articleIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
    }

    /**
     * 测试节点的展品
     */
    @get('/test/list')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibitList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceIds = ctx.checkQuery('exhibitIds').optional().isSplitMd5().toSplitArray().len(1, 100).value;
        const articleIds = ctx.checkQuery('articleIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([testResourceIds, articleIds].every(isUndefined)) {
            throw new ArgumentError('params-required-validate-failed', 'exhibitIds,articleIds');
        }

        const condition: any = {nodeId, userId: this.ctx.userId};
        if (isArray(articleIds)) {
            condition['originInfo.id'] = {$in: articleIds};
        }
        if (isArray(testResourceIds)) {
            condition._id = {$in: testResourceIds};
        }

        const testResources = await this.testNodeService.findTestResources(condition, projection.join(' '));
        const exhibitList = testResources.map(item => this.testResourceAdapter.testResourceWrapToExhibitInfo(item, isLoadVersionProperty ? ({} as any) : null));
        ctx.success(exhibitList);
    }

    /**
     * 测试节点的展品
     */
    @get('/test')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibits() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const articleResourceTypes = ctx.checkQuery('articleResourceTypes').optional().toSplitArray().value;
        const omitArticleResourceType = ctx.checkQuery('omitArticleResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId, userId: ctx.userId};
        if (isString(articleResourceTypes)) {
            condition.resourceType = {$in: articleResourceTypes};
        } else if (isString(omitArticleResourceType)) {
            condition.resourceType = {$ne: omitArticleResourceType};
        }
        if (isArray(tags)) {
            condition['stateInfo.tagsInfo.tags'] = {$in: tags};
        }
        if (onlineStatus === 1 || onlineStatus === 0) {
            condition['stateInfo.onlineStatusInfo.onlineStatus'] = onlineStatus;
        }
        if (isString(keywords)) {
            const searchExp = {$regex: keywords, $options: 'i'};
            condition.$or = [{testResourceName: searchExp}, {'originInfo.name': searchExp}];
        }

        const pageResult = await this.testNodeService.findIntervalResourceList(condition, skip, limit, projection, sort);
        const exhibitPageResult: PageResult<ExhibitInfo> = {
            skip: pageResult.skip,
            limit: pageResult.limit,
            totalItem: pageResult.totalItem,
            dataList: []
        };
        for (const item of pageResult.dataList) {
            exhibitPageResult.dataList.push(this.testResourceAdapter.testResourceWrapToExhibitInfo(item, isLoadVersionProperty ? ({} as any) : null));
        }
        return ctx.success(exhibitPageResult);
    }

    /**
     * 查询单个测试展品
     */
    @get('/test/:exhibitId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibitDetail() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceId = ctx.checkParams('exhibitId').exist().isMd5().value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();

        const testResource = await this.testNodeService.findOneTestResource({nodeId, testResourceId});
        if (!testResource) {
            return null;
        }

        const exhibitInfo = this.testResourceAdapter.testResourceWrapToExhibitInfo(testResource, isLoadVersionProperty ? ({} as any) : null);
        ctx.success(exhibitInfo);
    }

    /**
     * 查询单个展品
     */
    @get('/:exhibitId')
    async exhibitDetail() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const isLoadContract = ctx.checkQuery('isLoadContract').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();

        let presentableInfo = await this.presentableService.findOne({nodeId, _id: presentableId});
        if (!presentableInfo) {
            return ctx.success(null);
        }

        let presentableVersionInfo = null;
        if (isLoadVersionProperty) {
            presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId versionProperty');
        }
        if (isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(first);
        }
        if (isLoadContract && ctx.isLoginUser()) {
            const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, ctx.userId);
            presentableInfo = Reflect.has(presentableInfo, 'toObject') ? (<any>presentableInfo).toObject() : presentableInfo;
            presentableInfo.contracts = contracts;
        }
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        ctx.success(exhibitInfo);
    }

    /**
     * 查询展品作品的信息
     */
    @get('/:exhibitId/articles/list')
    async exhibitArticleList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const articleNids = ctx.checkQuery('articleNids').toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findOne({nodeId, _id: presentableId});
        if (!presentableInfo) {
            throw new ArgumentError('参数校验失败,未找到展品信息');
        }

        const presentableVersion = await this.presentableVersionService.findOne({
            presentableId, version: presentableInfo.version
        }, 'dependencyTree');

        const articles = presentableVersion.dependencyTree.filter(x => articleNids.includes(x.nid));
        if (isEmpty(articles)) {
            return ctx.success(articles);
        }
        const resourceVersionPropertyInfos = await this.outsideApiService.getResourceVersionList(articles.map(x => x.versionId), {
            projection: 'versionId,systemProperty,customPropertyDescriptors'
        });

        ctx.success(articles.map(article => {
            const resourceVersionInfo = resourceVersionPropertyInfos.find(m => m.versionId === article.versionId);
            return {
                nid: article.nid,
                articleId: article.resourceId,
                articleName: article.resourceName,
                articleType: ArticleTypeEnum.IndividualResource,
                version: article.version,
                resourceType: article.resourceType,
                articleProperty: resourceVersionInfo ? Object.assign(resourceVersionInfo['customProperty'], resourceVersionInfo.systemProperty) : {}
            };
        }));
    }

    /**
     * 测试展品依赖的作品信息(含有存储对象)
     */
    @get('/test/:exhibitId/articles/list')
    async testExhibitArticleList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceId = ctx.checkParams('exhibitId').isPresentableId().value;
        const articleNids = ctx.checkQuery('articleNids').toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({
            testResourceId, nodeId
        }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            throw new ArgumentError('未找到展品信息');
        }

        const articles = testResourceTreeInfo.dependencyTree.filter(x => articleNids.includes(x.nid));
        if (isEmpty(articles)) {
            return ctx.success(articles);
        }
        const resourceVersions = articles.filter(x => x.type === TestResourceOriginType.Resource);
        const resourceVersionPropertyInfos = await this.outsideApiService.getResourceVersionList(resourceVersions.map(x => x.versionId), {
            projection: 'versionId,systemProperty,customPropertyDescriptors'
        });
        const objectInfos = await this.outsideApiService.getObjectListByObjectIds(articles.filter(x => x.type === TestResourceOriginType.Object).map(x => x.id), {
            projection: 'objectId,systemProperty,customPropertyDescriptors'
        });

        const result = [];
        for (const article of articles) {
            const property = article.type === TestResourceOriginType.Resource ?
                resourceVersionPropertyInfos.find(x => x.versionId === article.versionId) :
                objectInfos.find(x => x.objectId === article.id);
            result.push({
                nid: article.nid,
                articleId: article.id,
                articleName: article.name,
                articleType: article.type === TestResourceOriginType.Resource ? ArticleTypeEnum.IndividualResource : ArticleTypeEnum.StorageObject,
                version: article.version,
                resourceType: article.resourceType,
                articleProperty: property ? Object.assign(property['customProperty'], property.systemProperty) : {}
            });
        }
        ctx.success(result);
    }
}
