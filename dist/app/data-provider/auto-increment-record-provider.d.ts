import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';
export default class AutoIncrementRecordProvider extends MongoBaseOperation {
    constructor(model: any);
    /**
     * 获取下一个递增节点ID
     * @param {string} dataType
     * @returns {Promise<number>}
     */
    getNextNodeId(): Promise<number>;
}
