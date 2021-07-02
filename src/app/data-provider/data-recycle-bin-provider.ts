import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'

@provide()
@scope('Singleton')
export default class NodeProvider extends MongodbOperation<any> {
    constructor(@inject('model.DataRecycleBin') model) {
        super(model);
    }
}
