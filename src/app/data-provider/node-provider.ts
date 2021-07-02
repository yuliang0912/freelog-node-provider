import {NodeInfo} from "../../interface";
import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'

@provide()
@scope('Singleton')
export default class NodeProvider extends MongodbOperation<NodeInfo> {
    constructor(@inject('model.NodeInfo') model) {
        super(model);
    }
}
