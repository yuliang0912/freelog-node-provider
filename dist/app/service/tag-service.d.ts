import { findOptions, ITageService, NodeInfo, TagInfo } from '../../interface';
import TagInfoProvider from '../data-provider/tag-provider';
import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
import AutoIncrementRecordProvider from '../data-provider/auto-increment-record-provider';
export declare class TagService implements ITageService {
    ctx: FreelogContext;
    tagInfoProvider: TagInfoProvider;
    autoIncrementRecordProvider: AutoIncrementRecordProvider;
    nodeProvider: IMongodbOperation<NodeInfo>;
    /**
     * 创建tag
     * @param tags
     */
    create(tags: string[]): Promise<TagInfo[]>;
    /**
     * 查询多条
     * @param condition
     * @param options
     */
    find(condition: object, options?: findOptions<TagInfo>): Promise<TagInfo[]>;
    /**
     * 查询单条
     * @param condition
     * @param options
     */
    findOne(condition: object, options?: findOptions<TagInfo>): Promise<TagInfo>;
    /**
     * 更新tag
     * @param tagInfo
     * @param tagName
     */
    updateOne(tagInfo: TagInfo, tagName: string): Promise<boolean>;
    /**
     * 查询区间列表
     * @param condition
     * @param options
     */
    findIntervalList(condition: object, options?: findOptions<TagInfo>): Promise<PageResult<TagInfo>>;
    /**
     * 数量统计
     * @param condition
     */
    count(condition: object): Promise<number>;
    /**
     * 设置标签自增(自减)数量.
     * @param tagNames
     * @param number
     */
    setTagAutoIncrementCounts(tagNames: string[], number: 1 | -1): Promise<boolean>;
}
