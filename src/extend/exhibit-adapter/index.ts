import {first} from 'lodash';
import {ExhibitDependencyNodeInfo, ExhibitDependencyTree} from '../../interface';
import {provide} from 'midway';

@provide()
export class ExhibitInfoAdapter {

    /**
     * 展品平铺的依赖树节点转换成树状结构的依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    convertExhibitDependencyTree(dependencyTree: ExhibitDependencyNodeInfo[], startNid: string = '', maxDeep: number = 100, isContainRootNode: boolean = true): ExhibitDependencyTree[] {
        const targetDependencyInfo = dependencyTree.find(x => startNid ? (x.nid === startNid) : (x.deep === 1));
        if (!targetDependencyInfo) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;

        function recursionBuildDependencyTree(dependencies: ExhibitDependencyNodeInfo[], currDeep: number = 1): ExhibitDependencyTree[] {
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

        return isContainRootNode ? convertedDependencyTree : first(convertedDependencyTree)?.dependencies;
    }
}
