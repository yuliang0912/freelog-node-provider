import {controller, inject, get, provide} from 'midway';
import {first, isArray, isString, isUndefined} from 'lodash';
import {
    ExhibitInfo, INodeService, IPresentableService,
    IPresentableVersionService, PresentableVersionInfo
} from '../../interface';
import {ArgumentError, FreelogContext, IdentityTypeEnum, PageResult, visitorIdentityValidator} from 'egg-freelog-base';
import {PresentableCommonChecker} from '../../extend/presentable-common-checker';
import {PresentableAdapter} from '../../extend/exhibit-adapter/presentable-adapter';
import {ITestNodeService} from '../../test-node-interface';
import {TestResourceAdapter} from '../../extend/exhibit-adapter/test-resource-adapter';

@provide()
@controller('/v2/exhibits')
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

    /**
     * 批量查询展品
     */
    @get('/:nodeId/list')
    async exhibitList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('exhibitIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const workIds = ctx.checkQuery('workIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (presentableIds) {
            condition._id = {$in: presentableIds};
        }
        if (workIds) {
            condition['resourceInfo.resourceId'] = {$in: workIds};
        }
        if (!workIds && !presentableIds) {
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
    @get('/:nodeId')
    async exhibits() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const workResourceTypes = ctx.checkQuery('workResourceTypes').optional().toSplitArray().value;
        const omitWorkResourceType = ctx.checkQuery('omitWorkResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (workResourceTypes?.length) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = {$in: workResourceTypes};
        } else if (isString(omitWorkResourceType)) {
            condition['resourceInfo.resourceType'] = {$ne: omitWorkResourceType};
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
     * 查询单个展品
     */
    @get('/details/:exhibitId')
    async exhibitDetail() {
        const {ctx} = this;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();

        let presentableInfo = await this.presentableService.findById(presentableId);
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
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        ctx.success(exhibitInfo);
    }

    /**
     * 测试节点的展品
     */
    @get('/test/:nodeId/list')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibitList() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceIds = ctx.checkQuery('exhibitIds').optional().isSplitMd5().toSplitArray().len(1, 100).value;
        const workIds = ctx.checkQuery('workIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([testResourceIds, workIds].every(isUndefined)) {
            throw new ArgumentError('params-required-validate-failed', 'exhibitIds,workIds');
        }

        const condition: any = {nodeId, userId: this.ctx.userId};
        if (isArray(workIds)) {
            condition['originInfo.id'] = {$in: workIds};
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
    @get('/test/:nodeId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibits() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const workResourceTypes = ctx.checkQuery('workResourceTypes').optional().toSplitArray().value;
        const omitWorkResourceType = ctx.checkQuery('omitWorkResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId, userId: ctx.userId};
        if (isString(workResourceTypes)) {
            condition.resourceType = {$in: workResourceTypes};
        } else if (isString(omitWorkResourceType)) {
            condition.resourceType = {$ne: omitWorkResourceType};
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
    @get('/test/details/:exhibitId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testExhibitDetail() {
        const {ctx} = this;
        const testResourceId = ctx.checkParams('exhibitId').exist().isMd5().value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();

        const testResource = await this.testNodeService.findOneTestResource({testResourceId});
        if (!testResource) {
            return null;
        }

        const exhibitInfo = this.testResourceAdapter.testResourceWrapToExhibitInfo(testResource, isLoadVersionProperty ? ({} as any) : null);
        ctx.success(exhibitInfo);
    }
}
