import { IMongodbOperation } from 'egg-freelog-base';
import { PresentableInfo, PresentableVersionInfo } from '../../interface';
import { TestResourceInfo, TestResourceTreeInfo } from '../../test-node-interface';
export declare class ResourceTypeRepairService {
    presentableProvider: IMongodbOperation<PresentableInfo>;
    presentableVersionProvider: IMongodbOperation<PresentableVersionInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
    resourceTypeRepair(): Promise<void>;
}
