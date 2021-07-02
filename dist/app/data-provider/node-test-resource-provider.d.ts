import { MongodbOperation } from 'egg-freelog-base';
import { TestResourceInfo } from "../../test-node-interface";
export default class NodeTestResourceProvider extends MongodbOperation<TestResourceInfo> {
    constructor(model: any);
}
