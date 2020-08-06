import {provide, inject, scope} from 'midway';
import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';

@provide()
@scope('Singleton')
export default class NodeProvider extends MongoBaseOperation {
    constructor(@inject('model.DataRecycleBin') model) {
        super(model);
    }
}