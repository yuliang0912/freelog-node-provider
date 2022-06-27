import {inject, provide} from 'midway';
import {IMongodbOperation} from 'egg-freelog-base';
import {PresentableInfo, PresentableVersionInfo} from '../../interface';
import {TestResourceInfo, TestResourceTreeInfo} from '../../test-node-interface';

@provide()
export class ResourceTypeRepairService {
    @inject()
    presentableProvider: IMongodbOperation<PresentableInfo>;
    @inject()
    presentableVersionProvider: IMongodbOperation<PresentableVersionInfo>;
    @inject()
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    @inject()
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;

    async resourceTypeRepair() {
        this.presentableProvider.find({}, 'resourceInfo').then(async list => {
            for (const item of list) {
                this.presentableProvider.updateOne({_id: item.presentableId}, {'resourceInfo.resourceType': item.resourceInfo.resourceType}).then();
            }
        });
        this.presentableVersionProvider.find({}, 'presentableVersionId dependencyTree').then(list => {
            for (const item of list) {
                const model = (item as any).toObject();
                this.presentableVersionProvider.updateOne({presentableVersionId: model.presentableVersionId}, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
        this.nodeTestResourceProvider.find({}, 'testResourceId resourceType').then(async list => {
            for (const item of list) {
                this.nodeTestResourceProvider.updateOne({testResourceId: item.testResourceId}, {
                    resourceType: item.resourceType,
                    'originInfo.resourceType': item.resourceType
                }).then();
            }
        });
        this.nodeTestResourceTreeProvider.find({}, 'testResourceId dependencyTree').then(list => {
            for (const item of list) {
                const model = (item as any).toObject();
                this.nodeTestResourceTreeProvider.updateOne({testResourceId: model.testResourceId}, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
    }
}
