import { MongodbOperation } from 'egg-freelog-base';
import { TestResourceTreeInfo } from '../../test-node-interface';
export default class NodeTestResourceTreeProvider extends MongodbOperation<TestResourceTreeInfo> {
    constructor(model: any);
}
