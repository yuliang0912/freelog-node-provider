import { MongodbOperation } from 'egg-freelog-base';
import { PresentableInfo } from "../../interface";
export default class PresentableProvider extends MongodbOperation<PresentableInfo> {
    constructor(model: any);
}
