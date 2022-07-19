import { IMongodbOperation } from 'egg-freelog-base';
import { PresentableInfo, PresentableVersionInfo } from '../../interface';
import { TestResourceInfo, TestResourceTreeInfo } from '../../test-node-interface';
import { OutsideApiService } from './outside-api-service';
import { PresentableVersionService } from './presentable-version-service';
export declare class ResourceTypeRepairService {
    presentableProvider: IMongodbOperation<PresentableInfo>;
    presentableVersionProvider: IMongodbOperation<PresentableVersionInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
    presentableVersionService: PresentableVersionService;
    outsideApiService: OutsideApiService;
    resourceTypeMap: Map<string, string[]>;
    resourceTypeRepair(): Promise<void>;
    presentableMetaRepair(): Promise<void>;
    presentableExpiredContractClear(): Promise<void>;
    private convertResourceTypes;
}
