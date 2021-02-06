import { NodeInfo } from "../../interface";
import { MongodbOperation } from 'egg-freelog-base';
export default class NodeProvider extends MongodbOperation<NodeInfo> {
    constructor(model: any);
}
