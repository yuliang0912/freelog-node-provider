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
const test_node_interface_1 = require("../../../test-node-interface");
const test_rule_checker_1 = require("../test-rule-checker");
const lodash_1 = require("lodash");
let ImportObjectEntityHandler = class ImportObjectEntityHandler {
    ctx;
    testRuleChecker;
    outsideApiService;
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
                    versions: model.versions,
                    versionRange: model.versionRange,
                    versionId: model.versionId,
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
            matchRule.ruleInfo.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_object_not_existed', matchRule.ruleInfo.candidate.name);
            matchRule.matchErrors.push(matchRule.ruleInfo.errorMsg);
            return;
        }
        if (objectInfo.userId && objectInfo.userId !== userId) {
            matchRule.ruleInfo.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_access_limited', matchRule.ruleInfo.candidate.name);
            matchRule.matchErrors.push(matchRule.ruleInfo.errorMsg);
            return;
        }
        if ((0, lodash_1.isEmpty)(objectInfo.resourceType ?? [])) {
            matchRule.ruleInfo.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_no_resource_type', matchRule.ruleInfo.candidate.name);
            matchRule.matchErrors.push(matchRule.ruleInfo.errorMsg);
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: objectInfo.objectId,
            ownerUserId: objectInfo.userId,
            name: matchRule.ruleInfo.candidate.name,
            type: test_node_interface_1.TestResourceOriginType.Object,
            resourceType: objectInfo.resourceType,
            version: null,
            versions: [],
            coverImages: ['http://static.testfreelog.com/static/default_cover.png']
        };
        this.testRuleChecker.fillEntityPropertyMap(matchRule, objectInfo.systemProperty, objectInfo.customPropertyDescriptors);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportObjectEntityHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_rule_checker_1.TestRuleChecker)
], ImportObjectEntityHandler.prototype, "testRuleChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportObjectEntityHandler.prototype, "outsideApiService", void 0);
ImportObjectEntityHandler = __decorate([
    (0, midway_1.provide)()
], ImportObjectEntityHandler);
exports.ImportObjectEntityHandler = ImportObjectEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LW9iamVjdC1lbnRpdHktaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvaW1wb3J0L2ltcG9ydC1vYmplY3QtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBRXZDLHNFQUdzQztBQUV0Qyw0REFBcUQ7QUFDckQsbUNBQStCO0FBRy9CLElBQWEseUJBQXlCLEdBQXRDLE1BQWEseUJBQXlCO0lBR2xDLEdBQUcsQ0FBaUI7SUFFcEIsZUFBZSxDQUFrQjtJQUVqQyxpQkFBaUIsQ0FBcUI7SUFFdEM7Ozs7T0FJRztJQUNILEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxNQUFjLEVBQUUsY0FBbUM7UUFFckYsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLFdBQVcsRUFBRTtZQUMvRSxVQUFVLEVBQUUsNkZBQTZGO1NBQzVHLENBQUMsQ0FBQztRQUNILEtBQUssTUFBTSxTQUFTLElBQUksY0FBYyxFQUFFO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQzFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzNE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