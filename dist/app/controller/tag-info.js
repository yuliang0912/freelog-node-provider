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
exports.TagInfoController = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let TagInfoController = class TagInfoController {
    ctx;
    tagService;
    async create() {
        const { ctx } = this;
        let tags = ctx.checkBody('tags').exist().isArray().len(1, 100).value;
        ctx.validateOfficialAuditAccount().validateParams();
        if (tags.some(x => !(0, lodash_1.isString)(x) || !x.trim().length)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-validate-failed', 'tags'));
        }
        tags = (0, lodash_1.uniqBy)(tags, x => x.trim());
        const existingTags = await this.tagService.find({ tagName: { $in: tags } });
        if (existingTags.length) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-validate-failed', 'tags'), { existingTags });
        }
        await this.tagService.create(tags).then(ctx.success);
    }
    async index() {
        const { ctx } = this;
        ctx.validateOfficialAuditAccount();
        await this.tagService.find(null).then(ctx.success);
    }
    async destroy() {
        const { ctx } = this;
        const tagIds = this.ctx.checkQuery('tagIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();
        const tagList = await this.tagService.find({ _id: { $in: tagIds } });
        if (!tagList.length) {
            return ctx.success(false);
        }
        await this.tagService.batchDeleteTag(tagList).then(ctx.success);
    }
    async update() {
        const { ctx } = this;
        const tagId = ctx.checkParams('tagId').exist().isMongoObjectId().value;
        const tagName = ctx.checkBody('tagName').exist().type('string').trim().len(1, 80).value;
        ctx.validateOfficialAuditAccount();
        const tagInfo = await this.tagService.findOne({ _id: tagId });
        ctx.entityNullObjectCheck(tagInfo);
        await this.tagService.updateOne(tagInfo, tagName).then(ctx.success);
    }
    // 统计标签使用数量
    async tagStatistics() {
        const { ctx } = this;
        const tagIds = ctx.checkQuery('tagIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const tagList = await this.tagService.find({ _id: { $in: tagIds } });
        if (!tagList.length) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed'));
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
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TagInfoController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TagInfoController.prototype, "tagService", void 0);
__decorate([
    (0, midway_1.post)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TagInfoController.prototype, "create", null);
__decorate([
    (0, midway_1.get)('/'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TagInfoController.prototype, "index", null);
__decorate([
    (0, midway_1.del)('/'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TagInfoController.prototype, "destroy", null);
__decorate([
    (0, midway_1.put)('/:tagId'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TagInfoController.prototype, "update", null);
__decorate([
    (0, midway_1.get)('/statistics'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TagInfoController.prototype, "tagStatistics", null);
TagInfoController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.priority)(1),
    (0, midway_1.controller)('/v2/nodes/tags')
], TagInfoController);
exports.TagInfoController = TagInfoController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFnLWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvdGFnLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXdDO0FBRXhDLG1DQUFrRjtBQUNsRix1REFFMEI7QUFLMUIsSUFBYSxpQkFBaUIsR0FBOUIsTUFBYSxpQkFBaUI7SUFHMUIsR0FBRyxDQUFpQjtJQUVwQixVQUFVLENBQWU7SUFHekIsS0FBSyxDQUFDLE1BQU07UUFFUixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsR0FBRyxDQUFDLDRCQUE0QixFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFcEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFBLGlCQUFRLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEQsTUFBTSxJQUFJLGdDQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUMvRTtRQUNELElBQUksR0FBRyxJQUFBLGVBQU0sRUFBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxF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