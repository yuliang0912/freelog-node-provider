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
     * @param userId
     * @param addObjectRules
     */
    async importObjectEntityDataFromRules(userId, addObjectRules) {
        const objectNames = addObjectRules.map(x => x.ruleInfo.candidate.name);
        const objects = await this.outsideApiService.getObjectListByFullNames(objectNames, {
            projection: 'bucketId,bucketName,objectName,userId,resourceType,systemProperty,customPropertyDescriptors'
        });
        for (const matchRule of addObjectRules) {
            const objectInfo = objects.find(x => `${x.bucketName}/${x.objectName}`.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, objectInfo, userId);
        }
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
     * @param objectInfo
     * @param userId
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
            coverImages: [],
            systemProperty: objectInfo.systemProperty,
            customPropertyDescriptors: objectInfo.customPropertyDescriptors
        };
        matchRule.efficientInfos.push({ type: 'add', count: 1 });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LW9iamVjdC1lbnRpdHktaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvaW1wb3J0LW9iamVjdC1lbnRpdHktaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFFdkMsbUVBR21DO0FBR25DLElBQWEseUJBQXlCLEdBQXRDLE1BQWEseUJBQXlCO0lBS2xDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsK0JBQStCLENBQUMsTUFBYyxFQUFFLGNBQW1DO1FBRXJGLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2RSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUU7WUFDL0UsVUFBVSxFQUFFLDZGQUE2RjtTQUM1RyxDQUFDLENBQUM7UUFDSCxLQUFLLE1BQU0sU0FBUyxJQUFJLGNBQWMsRUFBRTtZQUNwQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUMxSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUMzRDtJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUMsY0FBc0I7UUFFaEQsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLElBQUks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