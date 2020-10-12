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
exports.ImportObjectEntityHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
let ImportObjectEntityHandler = class ImportObjectEntityHandler {
    /**
     * 从规则中分析需要导入的资源数据
     * @param testRules
     * @param promiseResults
     */
    async importObjectEntityDataFromRules(userId, addObjectRules) {
        const objectNames = addObjectRules.map(x => x.ruleInfo.candidate.name);
        const objects = await this.outsideApiService.getObjectListByFullNames(objectNames, {
            projection: 'bucketId,bucketName,objectName,userId,resourceType'
        });
        addObjectRules.forEach(matchRule => {
            const objectInfo = objects.find(x => `${x.bucketName}/${x.objectName}`.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, objectInfo, userId);
        });
    }
    /**
     * 获取存储对象依赖树
     * @param objectIdOrName
     */
    async getObjectDependencyTree(objectIdOrName) {
        const objectDependencyTree = await this.outsideApiService.getObjectDependencyTree(objectIdOrName, {
            isContainRootNode: 1
        });
        function recursionConvertSubNodes(dependencies) {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
                    id: model.id,
                    name: model.name,
                    type: model.type,
                    resourceType: model.resourceType,
                    version: model.version,
                    versionId: model.versionId,
                    fileSha1: model.fileSha1,
                    dependencies: recursionConvertSubNodes(model.dependencies)
                };
            });
        }
        return recursionConvertSubNodes(objectDependencyTree);
    }
    /**
     * 填充实体数据
     * @param matchRule
     * @param presentableInfo
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule, objectInfo, userId) {
        if (!objectInfo) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`存储空间中不存在名称为${matchRule.ruleInfo.candidate.name}的对象`);
            return;
        }
        if (objectInfo.userId && objectInfo.userId !== userId) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`没有权限导入名称为${matchRule.ruleInfo.candidate.name}的存储对象`);
            return;
        }
        if ((objectInfo.resourceType ?? '').trim() === '') {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`名称为${matchRule.ruleInfo.candidate.name}的存储对象暂未设置资源类型,无法被使用`);
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: objectInfo.objectId,
            name: matchRule.ruleInfo.candidate.name,
            type: test_node_interface_1.TestResourceOriginType.Object,
            resourceType: objectInfo.resourceType ?? '',
            version: null,
            versions: [],
            coverImages: []
            // _originInfo: objectInfo
        };
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportObjectEntityHandler.prototype, "outsideApiService", void 0);
ImportObjectEntityHandler = __decorate([
    midway_1.provide()
], ImportObjectEntityHandler);
exports.ImportObjectEntityHandler = ImportObjectEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LW9iamVjdC1lbnRpdHktaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvaW1wb3J0LW9iamVjdC1lbnRpdHktaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFFdkMsbUVBS21DO0FBR25DLElBQWEseUJBQXlCLEdBQXRDLE1BQWEseUJBQXlCO0lBS2xDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsK0JBQStCLENBQUMsTUFBYyxFQUFFLGNBQW1DO1FBRXJGLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2RSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUU7WUFDL0UsVUFBVSxFQUFFLG9EQUFvRDtTQUNuRSxDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQy9CLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQzFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxjQUFzQjtRQUVoRCxNQUFNLG9C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