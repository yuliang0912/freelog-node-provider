"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExhibitInfoAdapter = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
let ExhibitInfoAdapter = class ExhibitInfoAdapter {
    /**
     * 展品平铺的依赖树节点转换成树状结构的依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    convertExhibitDependencyTree(dependencyTree, startNid = '', maxDeep = 100, isContainRootNode = true) {
        const targetDependencyInfo = dependencyTree.find(x => startNid ? (x.nid === startNid) : (x.deep === 1));
        if (!targetDependencyInfo) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
        function recursionBuildDependencyTree(dependencies, currDeep = 1) {
            if (!dependencies.length || currDeep++ >= maxDeep) {
                return [];
            }
            return dependencies.map(item => {
                return {
                    nid: item.nid,
                    workId: item.workId,
                    workName: item.workName,
                    workType: item.workType,
                    resourceType: item.resourceType,
                    version: item.version,
                    versionRange: item.versionRange,
                    versionId: item.versionId,
                    deep: item.deep,
                    parentNid: item.parentNid,
                    dependencies: recursionBuildDependencyTree(dependencies.filter(x => x.parentNid === item.nid), currDeep)
                };
            });
        }
        const convertedDependencyTree = recursionBuildDependencyTree([targetDependencyInfo]);
        return isContainRootNode ? convertedDependencyTree : lodash_1.first(convertedDependencyTree)?.dependencies;
    }
};
ExhibitInfoAdapter = __decorate([
    midway_1.provide()
], ExhibitInfoAdapter);
exports.ExhibitInfoAdapter = ExhibitInfoAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2V4aGliaXQtYWRhcHRlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxtQ0FBNkI7QUFFN0IsbUNBQStCO0FBRy9CLElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBRTNCOzs7Ozs7T0FNRztJQUNILDRCQUE0QixDQUFDLGNBQTJDLEVBQUUsV0FBbUIsRUFBRSxFQUFFLFVBQWtCLEdBQUcsRUFBRSxvQkFBNkIsSUFBSTtRQUNySixNQUFNLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQ3ZCLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUVwRCxTQUFTLDRCQUE0QixDQUFDLFlBQXlDLEVBQUUsV0FBbUIsQ0FBQztZQUNqRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxRQUFRLEVBQUUsSUFBSSxPQUFPLEVBQUU7Z0JBQy9DLE9BQU8sRUFBRSxDQUFDO2FBQ2I7WUFDRCxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzNCLE9BQU87b0JBQ0gsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO29CQUNiLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO29CQUN2QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7b0JBQ3ZCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDL0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO29CQUNyQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7b0JBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztvQkFDekIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO29CQUNmLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztvQkFDekIsWUFBWSxFQUFFLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUM7aUJBQzNHLENBQUM7WUFDTixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxNQUFNLHVCQUF1QixHQUFHLDRCQUE0QixDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRXJGLE9BQU8saUJBQWlCLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxjQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxZQUFZLENBQUM7SUFDdEcsQ0FBQztDQUNKLENBQUE7QUF6Q1ksa0JBQWtCO0lBRDlCLGdCQUFPLEVBQUU7R0FDRyxrQkFBa0IsQ0F5QzlCO0FBekNZLGdEQUFrQiJ9