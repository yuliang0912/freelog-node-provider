import { ExhibitDependencyNodeInfo, ExhibitDependencyTree } from '../../interface';
export declare class ExhibitInfoAdapter {
    /**
     * 展品平铺的依赖树节点转换成树状结构的依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    convertExhibitDependencyTree(dependencyTree: ExhibitDependencyNodeInfo[], startNid?: string, maxDeep?: number, isContainRootNode?: boolean): ExhibitDependencyTree[];
}
