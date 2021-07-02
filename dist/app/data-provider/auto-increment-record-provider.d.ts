import { MongodbOperation } from 'egg-freelog-base';
export default class AutoIncrementRecordProvider extends MongodbOperation<any> {
    constructor(model: any);
    /**
     * 获取下一个递增节点ID
     */
    getNextNodeId(): Promise<number>;
    /**
     * 获取下一个tagId
     */
    getNextTagId(): Promise<number>;
}
