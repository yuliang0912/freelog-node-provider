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
    __metadata("design:type", Object)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL25vZGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFXdkMsbUNBQWtDO0FBR2xDLElBQWEsV0FBVyxHQUF4QixNQUFhLFdBQVc7SUFlcEIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUM5QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUMsTUFBTSxFQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTBCO1FBRXZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUNoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUV0RSxNQUFNLFFBQVEsR0FBYTtZQUN2QixNQUFNO1lBQ04sUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU07WUFDNUIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQ2hDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztTQUM5RSxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFjLEVBQUUsR0FBRyxJQUFJ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