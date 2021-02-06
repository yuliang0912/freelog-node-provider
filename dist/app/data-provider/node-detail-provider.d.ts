import { NodeDetailInfo } from "../../interface";
import { MongodbOperation } from 'egg-freelog-base';
export default class NodeDetailProvider extends MongodbOperation<NodeDetailInfo> {
    constructor(model: any);
}
