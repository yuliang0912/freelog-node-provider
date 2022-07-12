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
    outsideApiService;
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
            return new Map(list.map(x => [x.nodeId, x.freezeInfo.remark.length ? x.freezeInfo.remark : x.freezeInfo.reason]));
        });
        return nodes.map((item) => {
            const nodeInfo = item.toObject ? item.toObject() : item;
            nodeInfo.freezeReason = resourceFreezeRecordMap.get(nodeInfo.nodeId) ?? '';
            return nodeInfo;
        });
    }
    /**
     * 填充节点所有者信息
     * @param nodes
     */
    async fillNodeOwnerUserInfo(nodes) {
        const userStatusMap = await this.outsideApiService.getUserList(nodes.map(x => x.ownerUserId), { projection: 'userId,status' }).then(list => {
            return new Map(list.map(x => [x.userId, x.status]));
        });
        return nodes.map((item) => {
            const nodeInfo = item.toObject ? item.toObject() : item;
            nodeInfo.ownerUserStatus = userStatusMap.get(nodeInfo.userId) ?? 0;
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
], NodeService.prototype, "outsideApiService", void 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL25vZGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsb0dBQTBGO0FBQzFGLHFDQUEwQztBQUMxQyxtQ0FBK0I7QUFHL0IsSUFBYSxXQUFXLEdBQXhCLE1BQWEsV0FBVztJQUdwQixHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFDO0lBRWxCLFVBQVUsQ0FBZTtJQUV6QixZQUFZLENBQThCO0lBRTFDLGlCQUFpQixDQUFxQjtJQUV0Qyx3QkFBd0IsQ0FBeUI7SUFFakQsMkJBQTJCLENBQThCO0lBRXpELEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDOUMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUEwQjtRQUV2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7UUFDaEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFdEUsTUFBTSxRQUFRLEdBQWE7WUFDdkIsTUFBTTtZQUNOLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUMxQixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNO1lBQzVCLGFBQWEsRUFBRSxRQUFRLENBQUMsUUFBUTtZQUNoQyxJQUFJLEVBQUUsRUFBRTtZQUNSLFNBQVMsRUFBRSxJQUFJ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