import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'
import {NodeTestRuleInfo} from "../../test-node-interface";

@provide()
@scope('Singleton')
export default class NodeTestRuleProvider extends MongodbOperation<NodeTestRuleInfo> {
    constructor(@inject('model.NodeTestRuleInfo') model) {
        super(model);
    }
}
