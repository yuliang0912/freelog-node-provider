import {INodeService, ITageService} from '../../interface';
import {controller, inject, get, post, provide, put} from 'midway';
import {isUndefined, isNumber, isArray, isString, last} from 'lodash';
import {IdentityTypeEnum, visitorIdentityValidator, ArgumentError, FreelogContext} from 'egg-freelog-base';
import {isDate} from 'lodash';
import {NodeStatusEnum} from '../../enum';

// import {NodeStatusEnum} from '../../enum';

@provide()
@controller('/v2/nodes')
export class NodeController {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    nodeService: INodeService;
    @inject()
    tagService: ITageService;

    @get('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async index() {

        const {ctx} = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().default(2).in([1, 2, 5, 6]).toInt().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {ownerUserId: ctx.userId};
        if (isNumber(status)) {
            condition.status = status;
        }

        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);
    }

    @get('/search')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async indexForAdminWithTags() {

        const {ctx} = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().in([0, 1, 2]).toInt().value;
        const tags = ctx.checkQuery('tags').ignoreParamWhenEmpty().toSplitArray().value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().trim().value;
        const startRegisteredDate = ctx.checkQuery('startRegisteredDate').ignoreParamWhenEmpty().toDate().value;
        const endRegisteredDate = ctx.checkQuery('endRegisteredDate').ignoreParamWhenEmpty().toDate().value;
        const projection = ctx.checkQuery('projection').ignoreParamWhenEmpty().toSplitArray().default([]).value;
        ctx.validateOfficialAuditAccount().validateParams();

        const condition: any = {};
        if (isNumber(status)) {
            condition.status = status;
        }
        if (keywords?.length) {
            const searchRegExp = new RegExp(keywords, 'i');
            condition.$or = [{nodeName: searchRegExp}, {nodeDomain: searchRegExp}];
        }
        if (isDate(startRegisteredDate) && isDate(endRegisteredDate)) {
            condition.createDate = {$gte: startRegisteredDate, $lte: endRegisteredDate};
        } else if (isDate(startRegisteredDate)) {
            condition.createDate = {$gte: startRegisteredDate};
        } else if (isDate(endRegisteredDate)) {
            condition.createDate = {$lte: endRegisteredDate};
        }
        if (tags) {
            condition.tags = {$in: tags};
        }

        await this.nodeService.findIntervalList(condition, skip, limit, projection, sort).then(ctx.success);

        // const tagMap = await this.tagService.find({status: 0}).then(list => {
        //     return new Map(list.map(x => [x.tagId.toString(), pick(x, ['tagId', 'tag'])]));
        // });
        //
        // const list = [];
        // for (const nodeInfo of pageResult.dataList) {
        //     if (isArray(nodeInfo['nodeDetails']) && nodeInfo['nodeDetails'].length) {
        //         const nodeDetail = first<NodeDetailInfo>(nodeInfo['nodeDetails']);
        //         nodeInfo['statusChangeRemark'] = nodeDetail.statusChangeRemark ?? '';
        //     } else {
        //         nodeInfo['tags'] = [];
        //         nodeInfo['statusChangeRemark'] = '';
        //     }
        //     list.push(omit(nodeInfo, ['_id', 'nodeDetails', 'uniqueKey']));
        // }
        // pageResult.dataList = list;
        // return ctx.success(pageResult);
    }

    @get('/count')
    @visitorIdentityValidator(IdentityTypeEnum.InternalClient | IdentityTypeEnum.LoginUser)
    async createdCount() {

        const {ctx} = this;
        const userIds = ctx.checkQuery('userIds').exist().isSplitNumber().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const list = await this.nodeService.findUserCreatedNodeCounts(userIds.map(x => parseInt(x)));

        ctx.success(userIds.map(userId => {
            const record = list.find(x => x.userId.toString() === userId);
            return {userId: parseInt(userId), createdNodeCount: record?.count ?? 0};
        }));
    }

    @get('/list')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async list() {

        const {ctx} = this;
        const nodeIds = ctx.checkQuery('nodeIds').optional().isSplitNumber().toSplitArray().len(1, 100).value;
        const nodeDomains = ctx.checkQuery('nodeDomains').optional().toSplitArray().len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if (isUndefined(nodeIds) && isUndefined(nodeDomains)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'nodeIds or nodeDomains'));
        }

        const condition: any = {};
        if (isArray(nodeIds)) {
            condition.nodeId = {$in: nodeIds};
        }
        if (isArray(nodeDomains)) {
            condition.nodeDomain = {$in: nodeDomains};
        }

        await this.nodeService.find(condition, projection.join(' ')).then(ctx.success);
    }

    @post('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async create() {

        const {ctx} = this;
        const nodeName = ctx.checkBody('nodeName').exist().type('string').isNodeName().value;
        const nodeDomain = ctx.checkBody('nodeDomain').exist().type('string').isNodeDomain().toLowercase().value;
        ctx.validateParams();

        await this.nodeCommonChecker.checkRegisterNodeDomainAndName(nodeDomain, nodeName);
        await this.nodeCommonChecker.checkNodeCreatedLimit();

        await this.nodeService.createNode({nodeName, nodeDomain}).then(ctx.success);
    }

    @get('/detail')
    async detail() {

        const {ctx} = this;
        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value;
        const nodeName = ctx.checkQuery('nodeName').optional().isNodeName().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([nodeDomain, nodeName].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'));
        }

        const condition: any = {};
        if (isString(nodeDomain)) {
            condition.nodeDomain = nodeDomain;
        }
        if (isString(nodeName)) {
            condition.nodeName = nodeName;
        }

        await this.nodeService.findOne(condition, projection.join(' ')).then(ctx.success);
    }

    @get('/:nodeId')
    async show() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        await this.nodeService.findById(nodeId, projection.join(' ')).then(ctx.success);
    }

    /**
     * 为节点设置标签
     */
    @put('/:nodeId/setTag')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async setNodeTag() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().value;
        const tagNames = ctx.checkBody('tagNames').exist().isArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findOne({nodeId});
        ctx.entityNullObjectCheck(nodeInfo);

        await this.nodeService.setTag(nodeInfo, tagNames.map(x => x.trim())).then(ctx.success);
    }

    /**
     * 取消设置标签
     */
    @put('/:nodeId/unsetTag')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async unsetNodeTag() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const tagName = ctx.checkBody('tagName').exist().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findOne({nodeId});
        ctx.entityNullObjectCheck(nodeInfo);

        await this.nodeService.unsetTag(nodeInfo, tagName).then(ctx.success);
    }

    /**
     * 冻结节点
     */
    @put('/:nodeId/freeze')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async freezeNode() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const remark = ctx.checkBody('remark').optional().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);

        if ((nodeInfo.status & NodeStatusEnum.Freeze) === NodeStatusEnum.Freeze) {
            throw new ArgumentError('节点已被冻结,不能重复操作');
        }

        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, remark).then(ctx.success);
    }

    /**
     * 节点解封
     */
    @put('/:nodeId/deArchive')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async deArchiveNode() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const remark = ctx.checkBody('remark').optional().trim().value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);

        if ((nodeInfo.status & NodeStatusEnum.Freeze) !== NodeStatusEnum.Freeze) {
            throw new ArgumentError('节点未被冻结,无法进行解封操作');
        }

        await this.nodeService.freezeOrDeArchiveResource(nodeInfo, remark).then(ctx.success);
    }

    /**
     * 节点冻结记录
     */
    @get('/:nodeId/freezeRecords')
    async nodeFreezeRecords() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const isFilterLatest = ctx.checkQuery('isFilterLatest').optional().toBoolean().default(false).value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findById(nodeId);
        ctx.entityNullObjectCheck(nodeInfo);

        const record = await this.nodeService.findNodeFreezeRecords(nodeId);
        if (isFilterLatest) {
            return ctx.success([last(record.records)]);
        }
        ctx.success(record.records);
    }
}
