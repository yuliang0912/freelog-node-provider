import {provide, inject} from 'midway';
import {FreelogContext, IMongodbOperation, PageResult} from 'egg-freelog-base';
import {
    CreateNodeOptions,
    findOptions,
    INodeService,
    ITageService,
    NodeDetailInfo,
    NodeInfo,
    TagInfo
} from '../../interface';
import {difference} from 'lodash';
import AutoIncrementRecordProvider from '../data-provider/auto-increment-record-provider';

@provide()
export class NodeService implements INodeService {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    autoIncrementRecordProvider: AutoIncrementRecordProvider;
    @inject()
    tagService: ITageService;
    @inject()
    nodeProvider: IMongodbOperation<NodeInfo>;
    @inject()
    nodeDetailProvider: IMongodbOperation<NodeDetailInfo>;

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
                $group: {_id: "$ownerUserId", count: {"$sum": 1}}
            },
            {
                $project: {_id: 0, userId: "$_id", count: "$count"}
            }
        ])
    }

    async findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>> {
        return this.nodeProvider.findIntervalList(condition, skip, limit, projection?.toString(), sort);
    }

    async searchIntervalListByTags(condition: object, tagIds?: number[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>> {

        const pipeline: any = [
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
            pipeline.push({$match: {'nodeDetails.tagIds': {$in: tagIds}}});
        }
        if (Object.keys(condition).length) {
            pipeline.unshift({$match: condition});
        }
        const [totalItemInfo] = await this.nodeProvider.aggregate([...pipeline, ...[{$count: 'totalItem'}]])
        const {totalItem = 0} = totalItemInfo ?? {};

        pipeline.push({$sort: options?.sort ?? {userId: -1}}, {$skip: options?.skip ?? 0}, {$limit: options?.limit ?? 10});
        const dataList = await this.nodeProvider.aggregate(pipeline);

        return {
            skip: options?.skip ?? 0, limit: options?.limit ?? 10, totalItem, dataList
        }
    }

    async count(condition: object): Promise<number> {
        return this.nodeProvider.count(condition);
    }

    /**
     * 设置标签
     * @param nodeId
     * @param tagInfo
     */
    async setTag(nodeId: number, tagInfos: TagInfo[]): Promise<boolean> {

        const tagIds = tagInfos.map(x => x.tagId);
        const nodeDetail = await this.nodeDetailProvider.findOne({nodeId});
        if (!nodeDetail) {
            await this.nodeDetailProvider.create({nodeId, tagIds});
        } else {
            await this.nodeDetailProvider.updateOne({nodeId}, {$addToSet: {tagIds}})
        }

        const effectiveTagIds = difference(tagIds, nodeDetail?.tagIds ?? [])

        return this.tagService.setTagAutoIncrementCounts(effectiveTagIds, 1);
    }

    /**
     * 取消设置Tag
     * @param nodeId
     * @param tagInfo
     */
    async unsetTag(nodeId: number, tagInfo: TagInfo): Promise<boolean> {
        const nodeDetail = await this.nodeDetailProvider.findOne({nodeId});
        if (!nodeDetail || !nodeDetail.tagIds.includes(tagInfo.tagId)) {
            return true;
        }
        await this.nodeDetailProvider.updateOne({nodeId}, {
            tagIds: nodeDetail.tagIds.filter(x => x !== tagInfo.tagId)
        })
        return this.tagService.setTagAutoIncrementCount(tagInfo, -1);
    }

    /**
     * 更新节点详情
     * @param nodeId
     * @param model
     */
    async updateNodeDetailInfo(nodeId: number, model: Partial<NodeDetailInfo>): Promise<boolean> {
        return this.nodeDetailProvider.updateOne({nodeId}, model).then(t => Boolean(t.nModified));
    }
}
