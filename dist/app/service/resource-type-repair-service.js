"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceTypeRepairService = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const outside_api_service_1 = require("./outside-api-service");
const presentable_version_service_1 = require("./presentable-version-service");
let ResourceTypeRepairService = class ResourceTypeRepairService {
    presentableProvider;
    presentableVersionProvider;
    nodeTestResourceProvider;
    nodeTestResourceTreeProvider;
    presentableVersionService;
    outsideApiService;
    resourceTypeMap = new Map([
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
        this.presentableProvider.find({}, 'resourceInfo').then(async (list) => {
            for (const item of list) {
                let resourceType = this.convertResourceTypes(item.resourceInfo.resourceType);
                this.presentableProvider.updateOne({ _id: item.presentableId }, { 'resourceInfo.resourceType': resourceType }).then();
            }
        });
        this.presentableVersionProvider.find({}, 'presentableVersionId dependencyTree').then(list => {
            for (const item of list) {
                const model = item.toObject();
                for (let dependencyTreeElement of model.dependencyTree) {
                    dependencyTreeElement.resourceType = this.convertResourceTypes(dependencyTreeElement.resourceType);
                }
                this.presentableVersionProvider.updateOne({ presentableVersionId: model.presentableVersionId }, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
        this.nodeTestResourceProvider.find({}, 'testResourceId resourceType').then(async (list) => {
            for (const item of list) {
                let resourceType = this.convertResourceTypes(item.resourceType);
                this.nodeTestResourceProvider.updateOne({ testResourceId: item.testResourceId }, {
                    resourceType: item.resourceType,
                    'originInfo.resourceType': resourceType
                }).then();
            }
        });
        this.nodeTestResourceTreeProvider.find({}, 'testResourceId dependencyTree').then(list => {
            for (const item of list) {
                const model = item.toObject();
                for (let dependencyTreeElement of model.dependencyTree) {
                    dependencyTreeElement.resourceType = this.convertResourceTypes(dependencyTreeElement.resourceType);
                }
                this.nodeTestResourceTreeProvider.updateOne({ testResourceId: model.testResourceId }, {
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
                        const versionProperty = this.presentableVersionService._calculatePresentableVersionProperty(resourceVersionInfo.systemProperty, resourceVersionInfo.customPropertyDescriptors, presentableVersionInfo.presentableRewriteProperty);
                        this.presentableVersionProvider.updateOne({ presentableVersionId: presentableVersionInfo.presentableVersionId }, {
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
            this.presentableProvider.updateOne({ _id: presentable.presentableId }, {
                resolveResources: presentable.resolveResources
            }).catch(console.error);
        }
    }
    convertResourceTypes(resourceType) {
        if (!Array.isArray(resourceType)) {
            return [];
        }
        for (let [key, value] of this.resourceTypeMap) {
            if (resourceType.includes(key)) {
                resourceType.splice(resourceType.indexOf(key), 1, ...value);
            }
        }
        return (0, lodash_1.uniq)(resourceType);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ResourceTypeRepairService.prototype, "presentableProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ResourceTypeRepairService.prototype, "presentableVersionProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ResourceTypeRepairService.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ResourceTypeRepairService.prototype, "nodeTestResourceTreeProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_version_service_1.PresentableVersionService)
], ResourceTypeRepairService.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", outside_api_service_1.OutsideApiService)
], ResourceTypeRepairService.prototype, "outsideApiService", void 0);
ResourceTypeRepairService = __decorate([
    (0, midway_1.provide)()
], ResourceTypeRepairService);
exports.ResourceTypeRepairService = ResourceTypeRepairService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2UtdHlwZS1yZXBhaXItc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9yZXNvdXJjZS10eXBlLXJlcGFpci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUl2QyxtQ0FBNEI7QUFDNUIsK0RBQXdEO0FBQ3hELCtFQUF3RTtBQUd4RSxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQUdsQyxtQkFBbUIsQ0FBcUM7SUFFeEQsMEJBQTBCLENBQTRDO0lBRXRFLHdCQUF3QixDQUFzQztJQUU5RCw0QkFBNEIsQ0FBMEM7SUFFdEUseUJBQXlCLENBQTRCO0lBRXJELGlCQUFpQixDQUFvQjtJQUVyQyxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQW1CO1FBQ3hDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JCLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDcEIsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGtCQUFrQjtRQUNwQixJQUFJLENB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