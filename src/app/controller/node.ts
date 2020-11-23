import {INodeService} from '../../interface';
import {controller, inject, get, post, provide} from 'midway';
import {isUndefined, isNumber, isArray, isString} from 'lodash';
import {IdentityTypeEnum, visitorIdentityValidator, ArgumentError, FreelogContext} from 'egg-freelog-base';

@provide()
@controller('/v2/nodes')
export class NodeController {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    nodeService: INodeService;

    @get('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async index() {

        const {ctx} = this;
        const page = ctx.checkQuery('page').optional().default(1).gt(0).toInt().value;
        const pageSize = ctx.checkQuery('pageSize').optional().default(10).gt(0).lt(101).toInt().value;
        const status = ctx.checkQuery('status').optional().default(0).in([0, 1, 2]).toInt().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {ownerUserId: ctx.userId};
        if (!isNumber(status)) {
            condition.status = status;
        }

        await this.nodeService.findPageList(condition, page, pageSize, projection).then(ctx.success);
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
}
