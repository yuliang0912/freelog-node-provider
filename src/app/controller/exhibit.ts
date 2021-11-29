import {controller, inject, get, provide} from 'midway';
import {isArray, isString} from 'lodash';
import {
    ExhibitInfo,
    INodeService,
    IPresentableService,
    IPresentableVersionService,
    PresentableVersionInfo
} from '../../interface';
import {FreelogContext, IdentityTypeEnum, PageResult, visitorIdentityValidator} from 'egg-freelog-base';
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
}
