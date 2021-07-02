import { MongodbOperation } from 'egg-freelog-base';
import { PresentableVersionInfo } from "../../interface";
export default class PresentableVersionProvider extends MongodbOperation<PresentableVersionInfo> {
    constructor(model: any);
}
