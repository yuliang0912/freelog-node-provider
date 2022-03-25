import {findOptions, ITageService, NodeInfo, TagInfo} from '../../interface';
import {inject, provide} from 'midway';
import TagInfoProvider from '../data-provider/tag-provider';
import {FreelogContext, IMongodbOperation, PageResult} from 'egg-freelog-base';
import AutoIncrementRecordProvider from '../data-provider/auto-increment-record-provider';

@provide()
export class TagService implements ITageService {

    @inject()
    ctx: FreelogContext;
    @inject()
    tagInfoProvider: TagInfoProvider;
    @inject()
    autoIncrementRecordProvider: AutoIncrementRecordProvider;
    @inject()
    nodeProvider: IMongodbOperation<NodeInfo>;

    /**
     * 创建tag
     * @param tags
     */
    async create(tags: string[]): Promise<TagInfo[]> {
        const tagLists: Partial<TagInfo>[] = [];
        for (const tagName of tags) {
            tagLists.push({tagName, createUserId: this.ctx.userId});
        }

        return this.tagInfoProvider.insertMany(tagLists);
    }

    /**
     * 查询多条
     * @param condition
     * @param options
     */
    async find(condition: object, options?: findOptions<TagInfo>): Promise<TagInfo[]> {
        return this.tagInfoProvider.find(condition, options?.projection, options);
    }

    /**
     * 查询单条
     * @param condition
     * @param options
     */
    async findOne(condition: object, options?: findOptions<TagInfo>): Promise<TagInfo> {
        return this.tagInfoProvider.findOne(condition, options?.projection, options);
    }

    /**
     * 更新tag
     * @param tagInfo
     * @param tagName
     */
    async updateOne(tagInfo: TagInfo, tagName: string): Promise<boolean> {
        const session = await this.tagInfoProvider.model.startSession();
        await session.withTransaction(async () => {
            const task1 = this.tagInfoProvider.updateOne({_id: tagInfo.tagId}, {tagName}, {session});
            const task2 = this.nodeProvider.updateMany({tags: tagInfo.tagName}, {
                $set: {'tags.$': tagName}
            }, {session});
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
    async deleteTag(tagInfo: TagInfo): Promise<boolean> {

        const session = await this.tagInfoProvider.model.startSession();
        await session.withTransaction(async () => {
            const task1 = this.tagInfoProvider.deleteOne({_id: tagInfo.tagId}, {session});
            const task2 = this.nodeProvider.updateMany({tags: tagInfo.tagName}, {
                $pull: {tags: tagInfo.tagName}
            }, {multi: true, session});
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
    async findIntervalList(condition: object, options?: findOptions<TagInfo>): Promise<PageResult<TagInfo>> {
        return this.tagInfoProvider.findIntervalList(condition, options?.skip, options?.limit, options?.projection, options?.sort);
    }

    /**
     * 数量统计
     * @param condition
     */
    async count(condition: object): Promise<number> {
        return this.tagInfoProvider.count(condition);
    }

    /**
     * 设置标签自增(自减)数量.
     * @param tagNames
     * @param number
     */
    async setTagAutoIncrementCounts(tagNames: string[], number: 1 | -1): Promise<boolean> {
        return this.tagInfoProvider.updateMany({tagName: {$in: tagNames}}, {$inc: {totalSetCount: number}}).then(x => Boolean(x.nModified));
    }

    /**
     * 统计标签数量
     * @param tags
     */
    async tagStatistics(tags: string[]): Promise<Array<{ tag: string, count: number }>> {
        const condition = [
            {$match: {tags: {$in: tags}}},
            {$unwind: {path: '$tags'}},
            {$match: {tags: {$in: tags}}},
            {$group: {_id: '$tags', count: {'$sum': 1}}},
            {$project: {tag: `$_id`, _id: 0, count: '$count'}},
        ];
        return this.nodeProvider.aggregate(condition);
    }
}
