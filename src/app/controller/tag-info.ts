import {isString, uniqBy} from 'lodash';
import {ITageService} from '../../interface';
import {controller, get, inject, post, provide, put, priority, del} from 'midway';
import {
    IdentityTypeEnum, visitorIdentityValidator, FreelogContext, ArgumentError
} from 'egg-freelog-base';

@provide()
@priority(1)
@controller('/v2/nodes/tags')
export class TagInfoController {

    @inject()
    ctx: FreelogContext;
    @inject()
    tagService: ITageService;

    @post('/')
    async create() {

        const {ctx} = this;
        let tags = ctx.checkBody('tags').exist().isArray().len(1, 100).value;
        ctx.validateOfficialAuditAccount().validateParams();

        if (tags.some(x => !isString(x) || !x.trim().length)) {
            throw new ArgumentError(this.ctx.gettext('params-validate-failed', 'tags'));
        }
        tags = uniqBy<string>(tags, x => x.trim());
        const existingTags = await this.tagService.find({tagName: {$in: tags}});
        if (existingTags.length) {
            throw new ArgumentError(this.ctx.gettext('params-validate-failed', 'tags'), {existingTags});
        }
        await this.tagService.create(tags).then(ctx.success);
    }

    @get('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async index() {
        const {ctx} = this;
        ctx.validateOfficialAuditAccount();
        await this.tagService.find(null).then(ctx.success);
    }

    @del('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async destroy() {

        const {ctx} = this;
        const tagIds = this.ctx.checkQuery('tagIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();

        const tagList = await this.tagService.find({_id: {$in: tagIds}});
        if (!tagList.length) {
            return ctx.success(false);
        }

        await this.tagService.batchDeleteTag(tagList).then(ctx.success);
    }

    @put('/:tagId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async update() {

        const {ctx} = this;
        const tagId = ctx.checkParams('tagId').exist().isMongoObjectId().value;
        const tagName = ctx.checkBody('tagName').exist().type('string').trim().len(1, 80).value;
        ctx.validateOfficialAuditAccount();

        const tagInfo = await this.tagService.findOne({_id: tagId});
        ctx.entityNullObjectCheck(tagInfo);

        await this.tagService.updateOne(tagInfo, tagName).then(ctx.success);
    }

    // 统计标签使用数量
    @get('/statistics')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async tagStatistics() {
        const {ctx} = this;
        const tagIds = ctx.checkQuery('tagIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const tagList = await this.tagService.find({_id: {$in: tagIds}});
        if (!tagList.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed'));
        }

        const tagCountMap = await this.tagService.tagStatistics(tagList.map(x => x.tagName)).then(list => {
            return new Map(list.map(x => [x.tag, parseInt(x.count.toString())]));
        });

        ctx.success(tagList.map(x => {
            return {
                tagId: x.tagId,
                tagName: x.tagName,
                count: tagCountMap.get(x.tagName) ?? 0
            };
        }));
    }
}
