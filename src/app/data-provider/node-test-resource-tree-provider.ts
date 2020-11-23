import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'
import {TestResourceTreeInfo} from '../../test-node-interface';

@provide()
@scope('Singleton')
export default class NodeTestResourceTreeProvider extends MongodbOperation<TestResourceTreeInfo> {
    constructor(@inject('model.NodeTestResourceTreeInfo') model) {
        super(model);
    }
}
