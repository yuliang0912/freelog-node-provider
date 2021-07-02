import { MongodbOperation } from 'egg-freelog-base';
import { NodeTestRuleInfo } from "../../test-node-interface";
export default class NodeTestRuleProvider extends MongodbOperation<NodeTestRuleInfo> {
    constructor(model: any);
}
