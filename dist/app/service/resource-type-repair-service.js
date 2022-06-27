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
let ResourceTypeRepairService = class ResourceTypeRepairService {
    presentableProvider;
    presentableVersionProvider;
    nodeTestResourceProvider;
    nodeTestResourceTreeProvider;
    async resourceTypeRepair() {
        this.presentableProvider.find({}, 'resourceInfo').then(async (list) => {
            for (const item of list) {
                this.presentableProvider.updateOne({ _id: item.presentableId }, { 'resourceInfo.resourceType': item.resourceInfo.resourceType }).then();
            }
        });
        this.presentableVersionProvider.find({}, 'presentableVersionId dependencyTree').then(list => {
            for (const item of list) {
                const model = item.toObject();
                this.presentableVersionProvider.updateOne({ presentableVersionId: model.presentableVersionId }, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
        this.nodeTestResourceProvider.find({}, 'testResourceId resourceType').then(async (list) => {
            for (const item of list) {
                this.nodeTestResourceProvider.updateOne({ testResourceId: item.testResourceId }, {
                    resourceType: item.resourceType,
                    'originInfo.resourceType': item.resourceType
                }).then();
            }
        });
        this.nodeTestResourceTreeProvider.find({}, 'testResourceId dependencyTree').then(list => {
            for (const item of list) {
                const model = item.toObject();
                this.nodeTestResourceTreeProvider.updateOne({ testResourceId: model.testResourceId }, {
                    dependencyTree: model.dependencyTree
                });
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2UtdHlwZS1yZXBhaXItc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9yZXNvdXJjZS10eXBlLXJlcGFpci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQU12QyxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQUVsQyxtQkFBbUIsQ0FBcUM7SUFFeEQsMEJBQTBCLENBQTRDO0lBRXRFLHdCQUF3QixDQUFzQztJQUU5RCw0QkFBNEIsQ0FBMEM7SUFFdEUsS0FBSyxDQUFDLGtCQUFrQjtRQUNwQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksRUFBQyxFQUFFO1lBQ2hFLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNyQixJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUMsRUFBRSxFQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUN2STtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUscUNBQXFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEYsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLE1BQU0sS0FBSyxHQUFJLElBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxFQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxvQkFBb0IsRUFBQyxFQUFFO29CQUMxRixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7aUJBQ3ZDLENBQUMsQ0FBQzthQUNOO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsSUFBSSxFQUFDLEVBQUU7WUFDcEYsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsRUFBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBQyxFQUFFO29CQUMzRSxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7b0JBQy9CLHlCQUF5QixFQUFFLElBQUksQ0FBQyxZQUFZO2lCQUMvQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDYjtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEYsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLE1BQU0sS0FBSyxHQUFJLElBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxFQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFDLEVBQUU7b0JBQ2hGLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYztpQkFDdkMsQ0FBQyxDQUFDO2FBQ047UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSixDQUFBO0FBdkNHO0lBREMsSUFBQSxlQUFNLEdBQUU7O3NFQUMrQztBQUV4RDtJQURDLElBQUEsZUFBTSxHQUFFOzs2RUFDNkQ7QUFFdEU7SUFEQyxJQUFBLGVBQU0sR0FBRTs7MkVBQ3FEO0FBRTlEO0lBREMsSUFBQSxlQUFNLEdBQUU7OytFQUM2RDtBQVI3RCx5QkFBeUI7SUFEckMsSUFBQSxnQkFBTyxHQUFFO0dBQ0cseUJBQXlCLENBeUNyQztBQXpDWSw4REFBeUIifQ==