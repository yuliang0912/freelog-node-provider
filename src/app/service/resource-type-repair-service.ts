import {inject, provide} from 'midway';
import {IMongodbOperation} from 'egg-freelog-base';
import {PresentableInfo, PresentableVersionInfo} from '../../interface';
import {TestResourceInfo, TestResourceTreeInfo} from '../../test-node-interface';
import {uniq} from 'lodash';
import {OutsideApiService} from './outside-api-service';
import {PresentableVersionService} from './presentable-version-service';

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
    @inject()
    presentableVersionService: PresentableVersionService;
    @inject()
    outsideApiService: OutsideApiService;

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

    async presentableMetaRepair() {
        this.presentableVersionProvider.find({}, 'presentableVersionId dependencyTree presentableRewriteProperty').then(list => {
            for (let presentableVersionInfo of list) {
                const resourceVersionId = presentableVersionInfo.dependencyTree.find(x => x.deep === 1).versionId;
                this.outsideApiService.getResourceVersionInfo(resourceVersionId).then(resourceVersionInfo => {
                    if (resourceVersionInfo?.systemProperty) {
                        const versionProperty = this.presentableVersionService._calculatePresentableVersionProperty(
                            resourceVersionInfo.systemProperty,
                            resourceVersionInfo.customPropertyDescriptors,
                            presentableVersionInfo.presentableRewriteProperty
                        );
                        this.presentableVersionProvider.updateOne({presentableVersionId: presentableVersionInfo.presentableVersionId}, {
                            resourceSystemProperty: resourceVersionInfo?.systemProperty, versionProperty
                        });
                    }
                });
            }
        });
    }
    
    async presentableExpiredContractClear() {
        const presentables = await this.presentableProvider.find({}, 'resolveResources');
        for (let presentable of presentables) {
            const contractIds = presentable.resolveResources.map(x => x.contracts).flat().map(x => x.contractId);
            const expiredContractSet = await this.outsideApiService.getContractByContractIds(contractIds, {
                projection: 'contractId,status'
            }).then(list => {
                return new Set(list.filter(x => x.status === 1).map(x => x.contractId));
            });
            if (!expiredContractSet.size) {
                continue;
            }
            console.log(presentable.presentableId, [...expiredContractSet.values()]);
            for (let resolveResource of presentable.resolveResources) {
                resolveResource.contracts = resolveResource.contracts.filter(x => !expiredContractSet.has(x.contractId));
            }
            this.presentableProvider.updateOne({_id: presentable.presentableId}, {
                resolveResources: presentable.resolveResources
            }).catch(console.error);
        }
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
