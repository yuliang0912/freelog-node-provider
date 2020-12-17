import {INodeService, ITageService, NodeDetailInfo} from '../../interface';
import {controller, inject, get, post, provide, put} from 'midway';
import {isUndefined, isNumber, isArray, isString} from 'lodash';
import {IdentityTypeEnum, visitorIdentityValidator, ArgumentError, FreelogContext} from 'egg-freelog-base';
import {isDate, omit, first, pick, differenceWith} from 'lodash';
import {NodeStatus} from "../../enum";

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
        const status = ctx.checkQuery('status').ignoreParamWhenEmpty().default(0).in([0, 1, 2]).toInt().value;
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
        const tagIds = ctx.checkQuery('tagIds').ignoreParamWhenEmpty().isSplitNumber().toSplitArray().value;
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

        const pageResult = await this.nodeService.searchIntervalListByTags(condition, tagIds?.map(x => parseInt(x)), {
            limit, skip, sort, projection: projection.join(' ')
        });

        const tagMap = await this.tagService.find({status: 0}).then(list => {
            return new Map(list.map(x => [x.tagId.toString(), pick(x, ['tagId', 'tag'])]));
        })

        const list = [];
        for (const nodeInfo of pageResult.dataList) {
            if (isArray(nodeInfo['nodeDetails']) && nodeInfo['nodeDetails'].length) {
                const nodeDetail = first<NodeDetailInfo>(nodeInfo['nodeDetails']);
                nodeInfo['tags'] = nodeDetail.tagIds.filter(x => tagMap.has(x.toString())).map(x => tagMap.get(x.toString()));
                nodeInfo['statusChangeRemark'] = nodeDetail.statusChangeRemark ?? '';
            } else {
                nodeInfo['tags'] = [];
                nodeInfo['statusChangeRemark'] = '';
            }
            list.push(omit(nodeInfo, ['_id', 'nodeDetails', 'uniqueKey']));
        }
        pageResult.dataList = list;
        return ctx.success(pageResult);
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
            return {userId: parseInt(userId), createdNodeCount: record?.count ?? 0}
        }))
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
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'nodeIds or nodeDomains'))
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
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
    async detail() {

        const {ctx} = this;
        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value;
        const nodeName = ctx.checkQuery('nodeName').optional().isNodeName().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([nodeDomain, nodeName].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
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
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
    async show() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        await this.nodeService.findById(nodeId, projection.join(' ')).then(ctx.success);
    }

    @put('/:nodeId/setTag')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async setNodeTag() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().value;
        const tagIds = ctx.checkBody("tagIds").exist().isArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();

        if (tagIds.some(x => !isNumber(x) || x < 1)) {
            throw new ArgumentError(this.ctx.gettext('params-validate-failed', 'tagIds'))
        }

        const tagList = await this.tagService.find({_id: {$in: tagIds}, status: 0});
        const invalidTagIds = differenceWith(tagIds, tagList, (x, y) => x.toString() === y.tagId.toString());
        if (invalidTagIds.length) {
            throw new ArgumentError(this.ctx.gettext('params-validate-failed', 'tagIds'), {invalidTagIds})
        }

        const nodeInfo = await this.nodeService.findOne({nodeId});
        ctx.entityNullObjectCheck(nodeInfo);

        await this.nodeService.setTag(nodeId, tagList).then(ctx.success);
    }

    @put('/:nodeId/unsetTag')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async unsetNodeTag() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const tagId = ctx.checkBody("tagId").exist().toInt().gt(0).value;
        ctx.validateParams().validateOfficialAuditAccount();

        const tagInfo = await this.tagService.findOne({_id: tagId, status: 0})
        ctx.entityNullObjectCheck(tagInfo);

        const nodeInfo = await this.nodeService.findOne({nodeId});
        ctx.entityNullObjectCheck(nodeInfo);

        await this.nodeService.unsetTag(nodeId, tagInfo).then(ctx.success);
    }

    // 冻结或恢复用户
    @put('/:nodeId/freeOrRecoverNodeStatus')
    async freeOrRecoverNodeStatus() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const status = ctx.checkBody("status").exist().toInt().in([NodeStatus.Freeze, NodeStatus.Normal]).value;
        const remark = ctx.checkBody("remark").ignoreParamWhenEmpty().type('string').len(0, 500).default('').value;
        ctx.validateParams().validateOfficialAuditAccount();

        const nodeInfo = await this.nodeService.findOne({nodeId});
        ctx.entityNullObjectCheck(nodeInfo);

        if (nodeInfo.status === status) {
            return ctx.success(true);
        }

        const task1 = this.nodeService.updateNodeInfo(nodeId, {status});
        const task2 = this.nodeService.updateNodeDetailInfo(nodeId, {statusChangeRemark: status === NodeStatus.Normal ? '' : remark ?? ''});

        await Promise.all([task1, task2]).then(t => ctx.success(true));
    }
}
