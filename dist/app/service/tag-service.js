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
exports.TagService = void 0;
const midway_1 = require("midway");
const tag_provider_1 = require("../data-provider/tag-provider");
const auto_increment_record_provider_1 = require("../data-provider/auto-increment-record-provider");
let TagService = class TagService {
    ctx;
    tagInfoProvider;
    autoIncrementRecordProvider;
    nodeProvider;
    /**
     * 创建tag
     * @param tags
     */
    async create(tags) {
        const tagLists = [];
        for (const tagName of tags) {
            tagLists.push({ tagName, createUserId: this.ctx.userId });
        }
        return this.tagInfoProvider.insertMany(tagLists);
    }
    /**
     * 查询多条
     * @param condition
     * @param options
     */
    async find(condition, options) {
        return this.tagInfoProvider.find(condition, options?.projection, options);
    }
    /**
     * 查询单条
     * @param condition
     * @param options
     */
    async findOne(condition, options) {
        return this.tagInfoProvider.findOne(condition, options?.projection, options);
    }
    /**
     * 更新tag
     * @param tagInfo
     * @param tagName
     */
    async updateOne(tagInfo, tagName) {
        const session = await this.tagInfoProvider.model.startSession();
        await session.withTransaction(async () => {
            const task1 = this.tagInfoProvider.updateOne({ _id: tagInfo.tagId }, { tagName }, { session });
            const task2 = this.nodeProvider.updateMany({ tags: tagInfo.tagName }, {
                $set: { 'tags.$': tagName }
            }, { session });
            await Promise.all([task1, task2]);
        }).finally(() => {
            session.endSession();
        });
        return true;
    }
    /**
     * 删除标签
     * @param tagInfo
     */
    async deleteTag(tagInfo) {
        const session = await this.tagInfoProvider.model.startSession();
        await session.withTransaction(async () => {
            const task1 = this.tagInfoProvider.deleteOne({ _id: tagInfo.tagId }, { session });
            const task2 = this.nodeProvider.updateMany({ tags: tagInfo.tagName }, {
                $pull: { tags: tagInfo.tagName }
            }, { multi: true, session });
            await Promise.all([task1, task2]);
        }).finally(() => {
            session.endSession();
        });
        return true;
    }
    /**
     * 批量删除标签
     * @param tagList
     */
    async batchDeleteTag(tagList) {
        const tagIds = tagList.map(x => x.tagId);
        const tagNames = tagList.map(x => x.tagName);
        const session = await this.tagInfoProvider.model.startSession();
        await session.withTransaction(async () => {
            const task1 = this.tagInfoProvider.deleteMany({ _id: { $in: tagIds } }, { session });
            const task2 = this.nodeProvider.updateMany({ tags: { $in: tagNames } }, {
                $pull: { tags: { $in: tagNames } }
            }, { multi: true, session });
            await Promise.all([task1, task2]);
        }).finally(() => {
            session.endSession();
        });
        return true;
    }
    /**
     * 查询区间列表
     * @param condition
     * @param options
     */
    async findIntervalList(condition, options) {
        return this.tagInfoProvider.findIntervalList(condition, options?.skip, options?.limit, options?.projection, options?.sort);
    }
    /**
     * 数量统计
     * @param condition
     */
    async count(condition) {
        return this.tagInfoProvider.count(condition);
    }
    /**
     * 设置标签自增(自减)数量.
     * @param tagNames
     * @param number
     */
    async setTagAutoIncrementCounts(tagNames, number) {
        return this.tagInfoProvider.updateMany({ tagName: { $in: tagNames } }, { $inc: { totalSetCount: number } }).then(x => Boolean(x.nModified));
    }
    /**
     * 统计标签数量
     * @param tags
     */
    async tagStatistics(tags) {
        const condition = [
            { $match: { tags: { $in: tags } } },
            { $unwind: { path: '$tags' } },
            { $match: { tags: { $in: tags } } },
            { $group: { _id: '$tags', count: { '$sum': 1 } } },
            { $project: { tag: `$_id`, _id: 0, count: '$count' } },
        ];
        return this.nodeProvider.aggregate(condition);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TagService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", tag_provider_1.default)
], TagService.prototype, "tagInfoProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", auto_increment_record_provider_1.default)
], TagService.prototype, "autoIncrementRecordProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TagService.prototype, "nodeProvider", void 0);
TagService = __decorate([
    (0, midway_1.provide)()
], TagService);
exports.TagService = TagService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFnLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGFnLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQXVDO0FBQ3ZDLGdFQUE0RDtBQUU1RCxvR0FBMEY7QUFHMUYsSUFBYSxVQUFVLEdBQXZCLE1BQWEsVUFBVTtJQUduQixHQUFHLENBQWlCO0lBRXBCLGVBQWUsQ0FBa0I7SUFFakMsMkJBQTJCLENBQThCO0lBRXpELFlBQVksQ0FBOEI7SUFFMUM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFjO1FBQ3ZCLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUM7UUFDeEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQzNEO1FBRUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBaUIsRUFBRSxPQUE4QjtRQUN4RCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLE9BQThCO1FBQzNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsU0FBUyxDQUFDLE9B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