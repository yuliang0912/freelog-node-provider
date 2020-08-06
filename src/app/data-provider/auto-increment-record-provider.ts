import {provide, inject, scope} from 'midway';
import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';

@provide()
@scope('Singleton')
export default class AutoIncrementRecordProvider extends MongoBaseOperation {
    constructor(@inject('model.AutoIncrementRecord') model) {
        super(model);
    }

    /**
     * 获取下一个递增节点ID
     * @param {string} dataType
     * @returns {Promise<number>}
     */
    async getNextNodeId(): Promise<number> {
        const dataType = 'NODE_ID';
        return super.findOneAndUpdate({dataType}, {$inc: {value: 1}}, {new: true}).then(model => {
            return model || super.create({dataType, value: 80000000})
        }).then(data => data.value);
    }
}
