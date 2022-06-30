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
let ResourceTypeRepairService = class ResourceTypeRepairService {
    presentableProvider;
    presentableVersionProvider;
    nodeTestResourceProvider;
    nodeTestResourceTreeProvider;
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
ResourceTypeRepairService = __decorate([
    (0, midway_1.provide)()
], ResourceTypeRepairService);
exports.ResourceTypeRepairService = ResourceTypeRepairService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2UtdHlwZS1yZXBhaXItc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9yZXNvdXJjZS10eXBlLXJlcGFpci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUl2QyxtQ0FBNEI7QUFHNUIsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFFbEMsbUJBQW1CLENBQXFDO0lBRXhELDBCQUEwQixDQUE0QztJQUV0RSx3QkFBd0IsQ0FBc0M7SUFFOUQsNEJBQTRCLENBQTBDO0lBRXRFLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBbUI7UUFDeEMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwQixDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsa0JBQWtCO1FBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFL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