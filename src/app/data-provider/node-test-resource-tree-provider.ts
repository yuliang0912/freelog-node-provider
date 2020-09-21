import {provide, inject, scope} from 'midway';
import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';

@provide()
@scope('Singleton')
export default class NodeTestResourceTreeProvider extends MongoBaseOperation {
    constructor(@inject('model.NodeTestResourceTreeInfo') model) {
        super(model);
    }
}
