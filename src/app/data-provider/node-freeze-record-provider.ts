import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base';

@provide()
@scope('Singleton')
export default class NodeFreezeRecordProvider extends MongodbOperation<any> {
    constructor(@inject('model.NodeFreezeRecord') model) {
        super(model);
    }
}
