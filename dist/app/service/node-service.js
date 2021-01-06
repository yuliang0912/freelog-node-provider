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
exports.NodeService = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auto_increment_record_provider_1 = require("../data-provider/auto-increment-record-provider");
let NodeService = class NodeService {
    async updateNodeInfo(nodeId, model) {
        return this.nodeProvider.updateOne({ nodeId }, model).then(t => Boolean(t.ok));
    }
    async createNode(options) {
        const userInfo = this.ctx.identityInfo.userInfo;
        const nodeId = await this.autoIncrementRecordProvider.getNextNodeId();
        const nodeInfo = {
            nodeId,
            nodeName: options.nodeName,
            nodeDomain: options.nodeDomain,
            ownerUserId: userInfo.userId,
            ownerUserName: userInfo.username,
            uniqueKey: this.nodeCommonChecker.generateNodeUniqueKey(options.nodeDomain)
        };
        return this.nodeProvider.create(nodeInfo);
    }
    async findById(nodeId, ...args) {
        return this.nodeProvider.findOne({ nodeId }, ...args);
    }
    async findByDomain(nodeDomain, ...args) {
        const uniqueKey = this.nodeCommonChecker.generateNodeUniqueKey(nodeDomain);
        return this.nodeProvider.findOne({ uniqueKey }, ...args);
    }
    async findByIds(nodeIds, ...args) {
        return this.nodeProvider.find({ nodeId: { $in: nodeIds } }, ...args);
    }
    async findOne(condition, ...args) {
        return this.nodeProvider.findOne(condition, ...args);
    }
    async find(condition, ...args) {
        return this.nodeProvider.find(condition, ...args);
    }
    async findUserCreatedNodeCounts(userIds) {
        return this.nodeProvider.aggregate([
            {
                $match: { ownerUserId: { $in: userIds } }
            },
            {
                $group: { _id: "$ownerUserId", count: { "$sum": 1 } }
            },
            {
                $project: { _id: 0, userId: "$_id", count: "$count" }
            }
        ]);
    }
    async findIntervalList(condition, skip, limit, projection, sort) {
        return this.nodeProvider.findIntervalList(condition, skip, limit, projection?.toString(), sort);
    }
    async searchIntervalListByTags(condition, tagIds, options) {
        const pipeline = [
            {
                $lookup: {
                    from: 'node-detail-infos',
                    localField: 'nodeId',
                    foreignField: 'nodeId',
                    as: 'nodeDetails'
                }
            }
        ];
        if (Array.isArray(tagIds) && tagIds.length) {
            pipeline.push({ $match: { 'nodeDetails.tagIds': { $in: tagIds } } });
        }
        if (Object.keys(condition).length) {
            pipeline.unshift({ $match: condition });
        }
        const [totalItemInfo] = await this.nodeProvider.aggregate([...pipeline, ...[{ $count: 'totalItem' }]]);
        const { totalItem = 0 } = totalItemInfo ?? {};
        pipeline.push({ $sort: options?.sort ?? { userId: -1 } }, { $skip: options?.skip ?? 0 }, { $limit: options?.limit ?? 10 });
        const dataList = await this.nodeProvider.aggregate(pipeline);
        return {
            skip: options?.skip ?? 0, limit: options?.limit ?? 10, totalItem, dataList
        };
    }
    async count(condition) {
        return this.nodeProvider.count(condition);
    }
    /**
     * 设置标签
     * @param nodeId
     * @param tagInfo
     */
    async setTag(nodeId, tagInfos) {
        const tagIds = tagInfos.map(x => x.tagId);
        const nodeDetail = await this.nodeDetailProvider.findOne({ nodeId });
        if (!nodeDetail) {
            await this.nodeDetailProvider.create({ nodeId, tagIds });
        }
        else {
            await this.nodeDetailProvider.updateOne({ nodeId }, { $addToSet: { tagIds } });
        }
        const effectiveTagIds = lodash_1.difference(tagIds, nodeDetail?.tagIds ?? []);
        return this.tagService.setTagAutoIncrementCounts(effectiveTagIds, 1);
    }
    /**
     * 取消设置Tag
     * @param nodeId
     * @param tagInfo
     */
    async unsetTag(nodeId, tagInfo) {
        const nodeDetail = await this.nodeDetailProvider.findOne({ nodeId });
        if (!nodeDetail || !nodeDetail.tagIds.includes(tagInfo.tagId)) {
            return true;
        }
        await this.nodeDetailProvider.updateOne({ nodeId }, {
            tagIds: nodeDetail.tagIds.filter(x => x !== tagInfo.tagId)
        });
        return this.tagService.setTagAutoIncrementCount(tagInfo, -1);
    }
    /**
     * 更新节点详情
     * @param nodeId
     * @param model
     */
    async updateNodeDetailInfo(nodeId, model) {
        return this.nodeDetailProvider.updateOne({ nodeId }, model).then(t => Boolean(t.nModified));
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", auto_increment_record_provider_1.default)
], NodeService.prototype, "autoIncrementRecordProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "tagService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeDetailProvider", void 0);
NodeService = __decorate([
    midway_1.provide()
], NodeService);
exports.NodeService = NodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL25vZGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFXdkMsbUNBQWtDO0FBQ2xDLG9HQUEwRjtBQUcxRixJQUFhLFdBQVcsR0FBeEIsTUFBYSxXQUFXO0lBZXBCLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDOUMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUEwQjtRQUV2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7UUFDaEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFdEUsTUFBTSxRQUFRLEdBQWE7WUFDdkIsTUFBTTtZQUNOLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUMxQixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNO1lBQzVCLGFBQWEsRUFBRSxRQUFRLENBQUMsUUFBUTtZQUNoQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7U0FDOUUsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBYyxF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