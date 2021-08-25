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
const enum_1 = require("../../enum");
let NodeService = class NodeService {
    ctx;
    nodeCommonChecker;
    tagService;
    nodeProvider;
    nodeFreezeRecordProvider;
    autoIncrementRecordProvider;
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
            tags: [],
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
                $group: { _id: '$ownerUserId', count: { '$sum': 1 } }
            },
            {
                $project: { _id: 0, userId: '$_id', count: '$count' }
            }
        ]);
    }
    async findIntervalList(condition, skip, limit, projection, sort) {
        return this.nodeProvider.findIntervalList(condition, skip, limit, projection?.toString(), sort);
    }
    // async searchIntervalListByTags(condition: object, tagNames?: string[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>> {
    //
    //     const pipeline: any = [
    //         {
    //             $lookup: {
    //                 from: 'node-detail-infos',
    //                 localField: 'nodeId',
    //                 foreignField: 'nodeId',
    //                 as: 'nodeDetails'
    //             }
    //         }
    //     ];
    //     if (Array.isArray(tagIds) && tagIds.length) {
    //         pipeline.push({$match: {'nodeDetails.tagIds': {$in: tagIds}}});
    //     }
    //     if (Object.keys(condition).length) {
    //         pipeline.unshift({$match: condition});
    //     }
    //     const [totalItemInfo] = await this.nodeProvider.aggregate([...pipeline, ...[{$count: 'totalItem'}]]);
    //     const {totalItem = 0} = totalItemInfo ?? {};
    //
    //     pipeline.push({$sort: options?.sort ?? {userId: -1}}, {$skip: options?.skip ?? 0}, {$limit: options?.limit ?? 10});
    //     const dataList = await this.nodeProvider.aggregate(pipeline);
    //
    //     return {
    //         skip: options?.skip ?? 0, limit: options?.limit ?? 10, totalItem, dataList
    //     };
    // }
    async count(condition) {
        return this.nodeProvider.count(condition);
    }
    /**
     * 冻结或解冻节点
     * @param nodeInfo
     * @param remark
     */
    async freezeOrDeArchiveResource(nodeInfo, remark) {
        // 已经冻结的就是做解封操作.反之亦然
        const operatorType = (nodeInfo.status & enum_1.NodeStatusEnum.Freeze) === enum_1.NodeStatusEnum.Freeze ? 2 : 1;
        const operatorRecordInfo = {
            operatorUserId: this.ctx.userId,
            operatorUserName: this.ctx.identityInfo.userInfo.username,
            type: operatorType, remark: remark ?? ''
        };
        const nodeStatus = operatorType === 1 ? (nodeInfo.status | enum_1.NodeStatusEnum.Freeze) : (nodeInfo.status ^ enum_1.NodeStatusEnum.Freeze);
        const session = await this.nodeProvider.model.startSession();
        await session.withTransaction(async () => {
            await this.nodeProvider.updateOne({ nodeId: nodeInfo.nodeId }, { status: nodeStatus }, { session });
            await this.nodeFreezeRecordProvider.findOneAndUpdate({ nodeId: nodeInfo.nodeId }, {
                $push: { records: operatorRecordInfo }
            }, { session }).then(model => {
                return model || this.nodeFreezeRecordProvider.create([{
                        nodeId: nodeInfo.nodeId,
                        nodeName: nodeInfo.nodeName,
                        records: [operatorRecordInfo]
                    }], { session });
            });
        }).catch(error => {
            throw error;
        }).finally(() => {
            session.endSession();
        });
        return true;
    }
    /**
     * 查找节点冻结操作记录
     * @param nodeId
     * @param args
     */
    async findNodeFreezeRecords(nodeId, ...args) {
        return this.nodeFreezeRecordProvider.findOne({ nodeId }, ...args);
    }
    /**
     * 设置标签
     * @param nodeInfo
     * @param tagNames
     */
    async setTag(nodeInfo, tagNames) {
        const effectiveTags = lodash_1.difference(tagNames, nodeInfo.tags);
        const tagList = await this.tagService.find({ tagName: { $in: tagNames } });
        const additionalTags = lodash_1.differenceWith(tagNames, tagList, (x, y) => x.toString() === y.tagName.toString());
        await this.tagService.create(additionalTags);
        await this.nodeProvider.updateOne({ nodeId: nodeInfo.nodeId }, {
            $addToSet: { tags: tagNames }
        });
        return this.tagService.setTagAutoIncrementCounts(effectiveTags, 1);
    }
    /**
     * 取消设置Tag
     * @param nodeInfo
     * @param tagName
     */
    async unsetTag(nodeInfo, tagName) {
        if (!nodeInfo.tags?.includes(tagName)) {
            return true;
        }
        await this.nodeProvider.updateOne({ nodeId: nodeInfo.nodeId }, {
            $pull: { tags: tagName }
        });
        return this.tagService.setTagAutoIncrementCounts([tagName], -1);
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
], NodeService.prototype, "tagService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeFreezeRecordProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", auto_increment_record_provider_1.default)
], NodeService.prototype, "autoIncrementRecordProvider", void 0);
NodeService = __decorate([
    midway_1.provide()
], NodeService);
exports.NodeService = NodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL25vZGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsbUNBQWtEO0FBQ2xELG9HQUEwRjtBQUMxRixxQ0FBMEM7QUFHMUMsSUFBYSxXQUFXLEdBQXhCLE1BQWEsV0FBVztJQUdwQixHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFDO0lBRWxCLFVBQVUsQ0FBZTtJQUV6QixZQUFZLENBQThCO0lBRTFDLHdCQUF3QixDQUF5QjtJQUVqRCwyQkFBMkIsQ0FBOEI7SUFFekQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUM5QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUMsTUFBTSxFQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTBCO1FBRXZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUNoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUV0RSxNQUFNLFFBQVEsR0FBYTtZQUN2QixNQUFNO1lBQ04sUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU07WUFDNUIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQ2hDLElBQUksRUFBRSxFQUFFO1lBQ1IsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxx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