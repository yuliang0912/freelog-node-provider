import {controller, inject, get, post, provide} from 'midway';
import {INodeService} from '../../interface';
import {visitorIdentity} from '../../extend/vistorIdentityDecorator';
import {LoginUser, InternalClient, ArgumentError} from 'egg-freelog-base/index';
import {isUndefined, isArray, isString} from 'lodash';

@provide()
@controller('/v2/nodes')
export class NodeController {

    @inject()
    nodeService: INodeService;
    @inject()
    nodeCommonChecker;

    @get('/')
    @visitorIdentity(LoginUser)
    async index(ctx) {

        const page = ctx.checkQuery('page').optional().default(1).gt(0).toInt().value;
        const pageSize = ctx.checkQuery('pageSize').optional().default(10).gt(0).lt(101).toInt().value;
        const status = ctx.checkQuery('status').optional().default(0).in([0, 1, 2]).toInt().value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {ownerUserId: ctx.userId};
        if (!isUndefined(status)) {
            condition.status = status;
        }

        let dataList = [];
        const totalItem = await this.nodeService.count(condition);
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.nodeService.findPageList(condition, page, pageSize, projection, {createDate: -1});
        }
        ctx.success({page, pageSize, totalItem, dataList});
    }

    @get('/list')
    @visitorIdentity(LoginUser)
    async list(ctx) {
        const nodeIds = ctx.checkQuery('nodeIds').optional().isSplitNumber().toSplitArray().len(1, 100).value;
        const nodeDomains = ctx.checkQuery('nodeDomains').optional().toSplitArray().len(1, 100).value
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
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
    @visitorIdentity(LoginUser)
    async create(ctx) {
        const nodeName = ctx.checkBody('nodeName').exist().type('string').isNodeName().value;
        const nodeDomain = ctx.checkBody('nodeDomain').exist().type('string').isNodeDomain().toLowercase().value;
        ctx.validateParams();

        await this.nodeCommonChecker.checkRegisterNodeDomainAndName(nodeDomain, nodeName);
        await this.nodeCommonChecker.checkNodeCreatedLimit();

        await this.nodeService.createNode({nodeName, nodeDomain}).then(ctx.success)
    }

    @get('/detail')
    @visitorIdentity(LoginUser | InternalClient)
    async detail(ctx) {
        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value;
        const nodeName = ctx.checkQuery('nodeName').optional().isNodeName().value;
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

        await this.nodeService.findOne(condition).then(ctx.success);
    }

    @get('/:nodeId')
    @visitorIdentity(LoginUser | InternalClient)
    async show(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        await this.nodeService.findById(nodeId, projection.join(' ')).then(ctx.success);
    }
}
