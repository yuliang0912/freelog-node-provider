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

    @del('/:tagId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async destroy() {

        const {ctx} = this;
        const tagId = this.ctx.checkParams('tagId').exist().isMongoObjectId().value;
        ctx.validateParams().validateOfficialAuditAccount();

        const tagInfo = await this.tagService.findOne({_id: tagId});
        ctx.entityNullObjectCheck(tagInfo);

        await this.tagService.deleteTag(tagInfo).then(ctx.success);
    }

    @put('/:tagId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async update() {

        const {ctx} = this;
        const tagId = ctx.checkParams('tagId').exist().isMongoObjectId().value;
        const tagName = ctx.checkBody('tag').exist().type('string').trim().len(1, 80).value;
        ctx.validateOfficialAuditAccount();

        const tagInfo = await this.tagService.findOne({_id: tagId});
        ctx.entityNullObjectCheck(tagInfo);

        await this.tagService.updateOne(tagInfo, tagName).then(ctx.success);
    }
}
