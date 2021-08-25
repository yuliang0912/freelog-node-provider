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
        0;
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
        await this.tagInfoProvider.updateOne({ _id: tagInfo.tagId }, { tagName }).then(t => Boolean(t.nModified));
        await this.nodeProvider.updateMany({ tags: tagInfo.tagName }, {
            $set: { 'tags.$': tagName }
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
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TagService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", tag_provider_1.default)
], TagService.prototype, "tagInfoProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", auto_increment_record_provider_1.default)
], TagService.prototype, "autoIncrementRecordProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TagService.prototype, "nodeProvider", void 0);
TagService = __decorate([
    midway_1.provide()
], TagService);
exports.TagService = TagService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFnLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGFnLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQXVDO0FBQ3ZDLGdFQUE0RDtBQUU1RCxvR0FBMEY7QUFHMUYsSUFBYSxVQUFVLEdBQXZCLE1BQWEsVUFBVTtJQUduQixHQUFHLENBQWlCO0lBRXBCLGVBQWUsQ0FBa0I7SUFFakMsMkJBQTJCLENBQThCO0lBRXpELFlBQVksQ0FBOEI7SUFFMUM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFjO1FBQXVCLENBQUMsQ0FBQTtRQUUvQyxNQUFNLFFBQVEsR0FBdUIsRUFBRSxDQUFDO1FBQ3hDLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztTQUMzRDtRQUVELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWlCLEVBQUUsT0FBOEI7UUFDeEQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIsRUFBRSxPQUE4QjtRQUMzRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFnQixFQUFFLE9BQWU7UUFDN0MsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN0RyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUMsRUFBRTtZQUN4RCxJQUFJLEVBQUUsRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDO1NBQzVCLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQWlCLEVBQUUsT0FBOEI7UUFDcEUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBaUI7UUFDekIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxRQUFrQixFQUFFLE1BQWM7UUFDOUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFDLE9BQU8sRUFBRSxFQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUMsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsYUFBYSxFQUFFLE1BQU0sRUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDeEksQ0FBQztDQUNKLENBQUE7QUE5RUc7SUFEQyxlQUFNLEVBQUU7O3VDQUNXO0FBRXBCO0lBREMsZUFBTSxFQUFFOzhCQUNRLHNCQUFlO21EQUFDO0FBRWpDO0lBREMsZUFBTSxFQUFFOzhCQUNvQix3Q0FBMkI7K0RBQUM7QUFFekQ7SUFEQyxlQUFNLEVBQUU7O2dEQUNpQztBQVRqQyxVQUFVO0lBRHRCLGdCQUFPLEVBQUU7R0FDRyxVQUFVLENBaUZ0QjtBQWpGWSxnQ0FBVSJ9