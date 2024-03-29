import {provide, inject} from 'midway';
import {FreelogContext, IMongodbOperation, PageResult} from 'egg-freelog-base';
import {
    CreateNodeOptions,
    INodeService,
    ITageService,
    NodeInfo
} from '../../interface';
import AutoIncrementRecordProvider from '../data-provider/auto-increment-record-provider';
import {NodeStatusEnum} from '../../enum';

@provide()
export class NodeService implements INodeService {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    tagService: ITageService;
    @inject()
    nodeProvider: IMongodbOperation<NodeInfo>;
    @inject()
    nodeFreezeRecordProvider: IMongodbOperation<any>;
    @inject()
    autoIncrementRecordProvider: AutoIncrementRecordProvider;

    async updateNodeInfo(nodeId: number, model: object): Promise<boolean> {
        return this.nodeProvider.updateOne({nodeId}, model).then(t => Boolean(t.ok));
    }

    async createNode(options: CreateNodeOptions): Promise<NodeInfo> {

        const userInfo = this.ctx.identityInfo.userInfo;
        const nodeId = await this.autoIncrementRecordProvider.getNextNodeId();

        const nodeInfo: NodeInfo = {
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

    async findById(nodeId: number, ...args): Promise<NodeInfo> {
        return this.nodeProvider.findOne({nodeId}, ...args);
    }

    async findByDomain(nodeDomain: string, ...args): Promise<NodeInfo> {
        const uniqueKey = this.nodeCommonChecker.generateNodeUniqueKey(nodeDomain);
        return this.nodeProvider.findOne({uniqueKey}, ...args);
    }

    async findByIds(nodeIds: number[], ...args): Promise<NodeInfo[]> {
        return this.nodeProvider.find({nodeId: {$in: nodeIds}}, ...args);
    }

    async findOne(condition: object, ...args): Promise<NodeInfo> {
        return this.nodeProvider.findOne(condition, ...args);
    }

    async find(condition: object, ...args): Promise<NodeInfo[]> {
        return this.nodeProvider.find(condition, ...args);
    }

    async findUserCreatedNodeCounts(userIds: number[]) {
        return this.nodeProvider.aggregate([
            {
                $match: {ownerUserId: {$in: userIds}}
            },
            {
                $group: {_id: '$ownerUserId', count: {'$sum': 1}}
            },
            {
                $project: {_id: 0, userId: '$_id', count: '$count'}
            }
        ]);
    }

    async findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>> {
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

    async count(condition: object): Promise<number> {
        return this.nodeProvider.count(condition);
    }

    /**
     * 冻结或解冻节点
     * @param nodeInfo
     * @param remark
     */
    async freezeOrDeArchiveResource(nodeInfo: NodeInfo, reason: string, remark: string): Promise<boolean> {

        // 已经冻结的就是做解封操作.反之亦然
        const operatorType = (nodeInfo.status & NodeStatusEnum.Freeze) === NodeStatusEnum.Freeze ? 2 : 1;
        const operatorRecordInfo = {
            operatorUserId: this.ctx.userId,
            operatorUserName: this.ctx.identityInfo.userInfo.username,
            type: operatorType, reason: reason ?? '', remark: remark ?? ''
        };

        const nodeStatus = operatorType === 1 ? (nodeInfo.status | NodeStatusEnum.Freeze) : (nodeInfo.status ^ NodeStatusEnum.Freeze);
        const session = await this.nodeProvider.model.startSession();
        await session.withTransaction(async () => {
            await this.nodeProvider.updateOne({nodeId: nodeInfo.nodeId}, {status: nodeStatus}, {session});
            await this.nodeFreezeRecordProvider.findOneAndUpdate({nodeId: nodeInfo.nodeId}, {
                $push: {records: operatorRecordInfo}
            }, {session}).then(model => {
                return model || this.nodeFreezeRecordProvider.create([{
                    nodeId: nodeInfo.nodeId,
                    nodeName: nodeInfo.nodeName,
                    records: [operatorRecordInfo]
                }], {session});
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
    async batchFindFreeOrRecoverRecords(nodeIds: number[], operationType?: 1 | 2, recordLimit?: number) {
        const condition = {nodeId: {$in: nodeIds}} as any;
        if (operationType) {
            condition['records.type'] = operationType;
        }
        return this.nodeFreezeRecordProvider.find(condition, {records: {$slice: recordLimit}} as any);
    }

    /**
     * 批量设置或移除节点标签
     * @param nodeIds
     * @param tags
     * @param setType
     */
    async batchSetOrRemoveNodeTags(nodeIds: number[], tags: string[], setType: 1 | 2): Promise<boolean> {
        const updateModel = {} as any;
        if (setType === 1) {
            updateModel.$addToSet = {tags};
        } else {
            updateModel.$pull = {tags: {$in: tags}};
        }
        return this.nodeProvider.updateMany({nodeId: {$in: nodeIds}}, updateModel).then(t => Boolean(t.ok));
    }

    /**
     * 设置标签
     * @param nodeInfo
     * @param tagNames
     */
    // async setTag(nodeInfo: NodeInfo, tagNames: string[]): Promise<boolean> {
    //
    //     const effectiveTags = difference(tagNames, nodeInfo.tags);
    //
    //     const tagList = await this.tagService.find({tagName: {$in: tagNames}});
    //     const additionalTags = differenceWith(tagNames, tagList, (x, y) => x.toString() === y.tagName.toString());
    //
    //     await this.tagService.create(additionalTags);
    //     await this.nodeProvider.updateOne({nodeId: nodeInfo.nodeId}, {
    //         $addToSet: {tags: tagNames}
    //     });
    //
    //     return this.tagService.setTagAutoIncrementCounts(effectiveTags, 1);
    // }

    /**
     * 取消设置Tag
     * @param nodeInfo
     * @param tagName
     */
    // async unsetTag(nodeInfo: NodeInfo, tagName: string): Promise<boolean> {
    //     if (!nodeInfo.tags?.includes(tagName)) {
    //         return true;
    //     }
    //     await this.nodeProvider.updateOne({nodeId: nodeInfo.nodeId}, {
    //         $pull: {tags: tagName}
    //     });
    //     return this.tagService.setTagAutoIncrementCounts([tagName], -1);
    // }
}
