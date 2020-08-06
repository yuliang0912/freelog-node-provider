import {provide, inject, scope} from 'midway';
import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';

@provide()
@scope('Singleton')
export default class PresentableProvider extends MongoBaseOperation {
    constructor(@inject('model.Presentable') model) {
        super(model);
    }
}
