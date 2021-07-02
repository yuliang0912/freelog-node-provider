import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'
import {PresentableInfo} from "../../interface";

@provide()
@scope('Singleton')
export default class PresentableProvider extends MongodbOperation<PresentableInfo> {
    constructor(@inject('model.Presentable') model) {
        super(model);
    }
}
