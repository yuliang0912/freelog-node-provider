import {provide, inject, scope} from 'midway';
import * as MongoBaseOperation from 'egg-freelog-base/lib/database/mongo-base-operation';

@provide()
@scope('Singleton')
export default class NodeTestRuleProvider extends MongoBaseOperation {
    constructor(@inject('model.NodeTestRuleInfo') model) {
        super(model);
    }
}
