import {inject, provide} from 'midway';
import {IMongodbOperation} from 'egg-freelog-base';
import {PresentableInfo, PresentableVersionInfo} from '../../interface';
import {TestResourceInfo, TestResourceTreeInfo} from '../../test-node-interface';
import {uniq} from 'lodash';

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

    resourceTypeMap = new Map<string, string[]>([
        ['theme', ['主题']],
        ['widget', ['插件']],
        ['reveal_slide', ['演示文稿']],
        ['novel', ['阅读', '文章']],
        ['txt', ['阅读', '文章']],
        ['markdown', ['阅读', '文章']],
        ['image', ['图片']],
        ['comic', ['图片']],
        ['video', ['视频']],
        ['audio', ['音频']],
    ]);

    async resourceTypeRepair() {
        this.presentableProvider.find({}, 'resourceInfo').then(async list => {
            for (const item of list) {
                let resourceType = this.convertResourceTypes(item.resourceInfo.resourceType);
                this.presentableProvider.updateOne({_id: item.presentableId}, {'resourceInfo.resourceType': resourceType}).then();
            }
        });
        this.presentableVersionProvider.find({}, 'presentableVersionId dependencyTree').then(list => {
            for (const item of list) {
                const model = (item as any).toObject();
                for (let dependencyTreeElement of model.dependencyTree) {
                    dependencyTreeElement.resourceType = this.convertResourceTypes(dependencyTreeElement.resourceType);
                }
                this.presentableVersionProvider.updateOne({presentableVersionId: model.presentableVersionId}, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
        this.nodeTestResourceProvider.find({}, 'testResourceId resourceType').then(async list => {
            for (const item of list) {
                let resourceType = this.convertResourceTypes(item.resourceType);
                this.nodeTestResourceProvider.updateOne({testResourceId: item.testResourceId}, {
                    resourceType: item.resourceType,
                    'originInfo.resourceType': resourceType
                }).then();
            }
        });
        this.nodeTestResourceTreeProvider.find({}, 'testResourceId dependencyTree').then(list => {
            for (const item of list) {
                const model = (item as any).toObject();
                for (let dependencyTreeElement of model.dependencyTree) {
                    dependencyTreeElement.resourceType = this.convertResourceTypes(dependencyTreeElement.resourceType);
                }
                this.nodeTestResourceTreeProvider.updateOne({testResourceId: model.testResourceId}, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
    }

    private convertResourceTypes(resourceType: string[]): string[] {
        if (!Array.isArray(resourceType)) {
            return [];
        }
        for (let [key, value] of this.resourceTypeMap) {
            if (resourceType.includes(key)) {
                resourceType.splice(resourceType.indexOf(key), 1, ...value);
            }
        }
        return uniq(resourceType);
    }
}
