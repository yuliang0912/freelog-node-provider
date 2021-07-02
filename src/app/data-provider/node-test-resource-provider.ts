import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'
import {TestResourceInfo} from "../../test-node-interface";

@provide()
@scope('Singleton')
export default class NodeTestResourceProvider extends MongodbOperation<TestResourceInfo> {
    constructor(@inject('model.NodeTestResourceInfo') model) {
        super(model);
    }
}
