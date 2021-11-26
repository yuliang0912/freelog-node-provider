import {
    ExhibitAuthNodeInfo,
    ExhibitDependencyNodeInfo,
    ExhibitInfo,
    ExhibitVersionInfo,
    FlattenPresentableAuthTree,
    FlattenPresentableDependencyTree,
    PresentableInfo,
    PresentableVersionInfo
} from '../../interface';
import {SubjectTypeEnum} from 'egg-freelog-base';
import {WorkTypeEnum} from '../../enum';
import {first} from 'lodash';
import {provide} from 'midway';

@provide()
export class PresentableAdapter {

    /**
     * presentable适配为展品
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    presentableWrapToExhibitInfo(presentableInfo: PresentableInfo, presentableVersionInfo?: PresentableVersionInfo): ExhibitInfo {

        const exhibitInfo: ExhibitInfo = {
            exhibitId: presentableInfo.presentableId,
            exhibitName: presentableInfo.presentableName,
            exhibitTitle: presentableInfo.presentableTitle,
            exhibitSubjectType: SubjectTypeEnum.Presentable,
            tags: presentableInfo.tags,
            intro: '展品产品侧未提供简介字段',
            coverImages: presentableInfo.coverImages,
            version: presentableInfo.version,
            policies: presentableInfo.policies,
            onlineStatus: presentableInfo.onlineStatus,
            nodeId: presentableInfo.nodeId,
            userId: presentableInfo.userId,
            workInfo: {
                workId: presentableInfo.resourceInfo.resourceId,
                workName: presentableInfo.resourceInfo.resourceName,
                resourceType: presentableInfo.resourceInfo.resourceType,
                workType: 1,
                workOwnerId: 0,
                workOwnerName: first(presentableInfo.resourceInfo.resourceName.split('/'))
            },
            status: 0
        };

        if (presentableVersionInfo) {
            exhibitInfo.versionInfo = PresentableAdapter.presentableVersionInfoWrapToExhibitVersionInfo(presentableVersionInfo);
        }

        return exhibitInfo;
    }

    /**
     * presentable版本适配为exhibit版本信息
     * @param presentableVersionInfo
     */
    private static presentableVersionInfoWrapToExhibitVersionInfo(presentableVersionInfo: PresentableVersionInfo): ExhibitVersionInfo {
        return {
            exhibitId: presentableVersionInfo.presentableId,
            version: presentableVersionInfo.version,
            workId: presentableVersionInfo.resourceId,
            workSystemProperty: presentableVersionInfo.resourceSystemProperty as any,
            workCustomPropertyDescriptors: presentableVersionInfo.resourceCustomPropertyDescriptors,
            exhibitRewriteProperty: presentableVersionInfo.presentableRewriteProperty,
            exhibitProperty: presentableVersionInfo.versionProperty as any,
            authTree: PresentableAdapter.presentableAuthTreeWrapToExhibitDependencyNodeInfo(presentableVersionInfo.authTree),
            dependencyTree: PresentableAdapter.presentableDependencyTreeWrapToExhibitDependencyNodeInfo(presentableVersionInfo.dependencyTree)
        };
    }

    /**
     * presentable依赖树适配为exhibit依赖树
     * @param presentableDependencyTree
     */
    static presentableDependencyTreeWrapToExhibitDependencyNodeInfo(presentableDependencyTree: FlattenPresentableDependencyTree[]): ExhibitDependencyNodeInfo[] {
        return presentableDependencyTree?.map(item => {
            return {
                nid: item.nid ?? '',
                workId: item.resourceId,
                workName: item.resourceName,
                workType: WorkTypeEnum.IndividualResource,
                version: item.version,
                versionRange: item.versionRange,
                resourceType: item.resourceType,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }

    /**
     * presentable授权树适配为exhibit依赖树
     * @param presentableAuthTree
     */
    static presentableAuthTreeWrapToExhibitDependencyNodeInfo(presentableAuthTree: FlattenPresentableAuthTree[]): ExhibitAuthNodeInfo[] {
        return presentableAuthTree?.map(item => {
            return {
                nid: item.nid,
                workId: item.resourceId,
                workName: item.resourceName,
                workType: WorkTypeEnum.IndividualResource,
                resourceType: item.resourceType,
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
}
