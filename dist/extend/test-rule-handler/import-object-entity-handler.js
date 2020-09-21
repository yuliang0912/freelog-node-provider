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
            return dependencies.map(model => Object({
                id: model.id,
                name: model.name,
                type: model.type,
                resourceType: model.resourceType,
                version: model.version,
                versionId: model.versionId,
                dependencies: recursionConvertSubNodes(model.dependencies)
            }));
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