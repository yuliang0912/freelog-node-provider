import {NodeDetailInfo} from "../../interface";
import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'

@provide()
@scope('Singleton')
export default class NodeDetailProvider extends MongodbOperation<NodeDetailInfo> {
    constructor(@inject('model.NodeDetailInfo') model) {
        super(model);
    }
}
