import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'

@provide()
@scope('Singleton')
export default class AutoIncrementRecordProvider extends MongodbOperation<any> {

    constructor(@inject('model.AutoIncrementRecord') model) {
        super(model);
    }

    /**
     * 获取下一个递增节点ID
     */
    async getNextNodeId(): Promise<number> {
        const dataType = 'NODE_ID';
        return super.findOneAndUpdate({dataType}, {$inc: {value: 1}}, {new: true}).then(model => {
            return model || super.create({dataType, value: 80000000})
        }).then(data => data.value);
    }
}
