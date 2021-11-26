import { ExhibitAuthNodeInfo, ExhibitDependencyNodeInfo, ExhibitInfo, FlattenPresentableAuthTree, FlattenPresentableDependencyTree, PresentableInfo, PresentableVersionInfo } from '../../interface';
export declare class PresentableAdapter {
    /**
     * presentable适配为展品
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    presentableWrapToExhibitInfo(presentableInfo: PresentableInfo, presentableVersionInfo?: PresentableVersionInfo): ExhibitInfo;
    /**
     * presentable版本适配为exhibit版本信息
     * @param presentableVersionInfo
     */
    private static presentableVersionInfoWrapToExhibitVersionInfo;
    /**
     * presentable依赖树适配为exhibit依赖树
     * @param presentableDependencyTree
     */
    static presentableDependencyTreeWrapToExhibitDependencyNodeInfo(presentableDependencyTree: FlattenPresentableDependencyTree[]): ExhibitDependencyNodeInfo[];
    /**
     * presentable授权树适配为exhibit依赖树
     * @param presentableAuthTree
     */
    static presentableAuthTreeWrapToExhibitDependencyNodeInfo(presentableAuthTree: FlattenPresentableAuthTree[]): ExhibitAuthNodeInfo[];
}
