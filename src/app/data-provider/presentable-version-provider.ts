import {provide, inject, scope} from 'midway';
import {MongodbOperation} from 'egg-freelog-base'
import {PresentableVersionInfo} from "../../interface";

@provide()
@scope('Singleton')
export default class PresentableVersionProvider extends MongodbOperation<PresentableVersionInfo> {
    constructor(@inject('model.PresentableVersion') model) {
        super(model);
    }
}
