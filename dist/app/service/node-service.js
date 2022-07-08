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
const auto_increment_record_provider_1 = require("../data-provider/auto-increment-record-provider");
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
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
    async freezeOrDeArchiveResource(nodeInfo, reason, remark) {
        // 已经冻结的就是做解封操作.反之亦然
        const operatorType = (nodeInfo.status & enum_1.NodeStatusEnum.Freeze) === enum_1.NodeStatusEnum.Freeze ? 2 : 1;
        const operatorRecordInfo = {
            operatorUserId: this.ctx.userId,
            operatorUserName: this.ctx.identityInfo.userInfo.username,
            type: operatorType, reason: reason ?? '', remark: remark ?? ''
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
     * 批量查找节点冻结与解封记录
     * @param nodeIds
     * @param operationType
     * @param recordLimit
     */
    async batchFindFreeOrRecoverRecords(nodeIds, operationType, recordLimit) {
        const condition = { nodeId: { $in: nodeIds } };
        if (operationType) {
            condition['records.type'] = operationType;
        }
        return this.nodeFreezeRecordProvider.find(condition, { records: { $slice: recordLimit } });
    }
    /**
     * 批量设置或移除节点标签
     * @param nodeIds
     * @param tags
     * @param setType
     */
    async batchSetOrRemoveNodeTags(nodeIds, tags, setType) {
        const updateModel = {};
        if (setType === 1) {
            updateModel.$addToSet = { tags };
        }
        else {
            updateModel.$pull = { tags: { $in: tags } };
        }
        return this.nodeProvider.updateMany({ nodeId: { $in: nodeIds } }, updateModel).then(t => Boolean(t.ok));
    }
    /**
     * 填充节点封禁原因
     * @param nodes
     */
    async fillNodeFreezeReason(nodes) {
        const freezeNodeIds = nodes.filter(x => (x?.status & 4) === 4).map(x => x.nodeId);
        if ((0, lodash_1.isEmpty)(freezeNodeIds)) {
            return nodes;
        }
        const condition = [
            { $match: { nodeId: { $in: freezeNodeIds }, 'records.type': 1 } },
            { $unwind: { path: '$records' } },
            { $match: { 'records.type': 1 } },
            { $group: { _id: '$nodeId', records: { $last: '$records' } } },
            { $project: { nodeId: '$_id', _id: false, freezeInfo: '$records' } }
        ];
        const resourceFreezeRecordMap = await this.nodeFreezeRecordProvider.aggregate(condition).then(list => {
            return new Map(list.map(x => [x.nodeId, x.freezeInfo.reason]));
        });
        return nodes.map((item) => {
            const nodeInfo = item.toObject ? item.toObject() : item;
            nodeInfo.freezeReason = resourceFreezeRecordMap.get(nodeInfo.nodeId) ?? '';
            return nodeInfo;
        });
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeService.prototype, "tagService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeService.prototype, "nodeFreezeRecordProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", auto_increment_record_provider_1.default)
], NodeService.prototype, "autoIncrementRecordProvider", void 0);
NodeService = __decorate([
    (0, midway_1.provide)()
], NodeService);
exports.NodeService = NodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL25vZGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsb0dBQTBGO0FBQzFGLHFDQUEwQztBQUMxQyxtQ0FBK0I7QUFHL0IsSUFBYSxXQUFXLEdBQXhCLE1BQWEsV0FBVztJQUdwQixHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFDO0lBRWxCLFVBQVUsQ0FBZTtJQUV6QixZQUFZLENBQThCO0lBRTFDLHdCQUF3QixDQUF5QjtJQUVqRCwyQkFBMkIsQ0FBOEI7SUFFekQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUM5QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUMsTUFBTSxFQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTBCO1FBRXZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUNoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUV0RSxNQUFNLFFBQVEsR0FBYTtZQUN2QixNQUFNO1lBQ04sUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU07WUFDNUIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQ2hDLElBQUksRUFBRSxFQUFFO1lBQ1IsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxx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