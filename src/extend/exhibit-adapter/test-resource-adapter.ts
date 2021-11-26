import {
    ExhibitAuthNodeInfo,
    ExhibitDependencyNodeInfo,
    ExhibitInfo,
    ExhibitVersionInfo
} from '../../interface';
import {SubjectTypeEnum} from 'egg-freelog-base';
import {WorkTypeEnum} from '../../enum';
import {first} from 'lodash';
import {
    FlattenTestResourceAuthTree,
    FlattenTestResourceDependencyTree,
    TestResourceInfo,
    TestResourceOriginType,
    TestResourceTreeInfo
} from '../../test-node-interface';
import {inject, provide} from 'midway';
import {TestNodeGenerator} from '../test-node-generator';

@provide()
export class TestResourceAdapter {

    @inject()
    testNodeGenerator: TestNodeGenerator;

    /**
     * 测试资源适配成展品
     * @param testResource
     * @param testResourceTreeInfo
     */
    testResourceWrapToExhibitInfo(testResource: TestResourceInfo, testResourceTreeInfo?: TestResourceTreeInfo): ExhibitInfo {

        const exhibitInfo: ExhibitInfo = {
            exhibitId: testResource.testResourceId,
            exhibitName: testResource.testResourceName,
            exhibitTitle: testResource.testResourceName,
            exhibitSubjectType: SubjectTypeEnum.Presentable,
            tags: testResource.stateInfo.tagInfo.tags,
            intro: '展品产品侧未提供简介字段',
            coverImages: testResource.originInfo.coverImages,
            version: testResource.originInfo.version,
            policies: [],
            onlineStatus: testResource.stateInfo.onlineStatusInfo?.onlineStatus ?? 1,
            nodeId: testResource.nodeId,
            userId: testResource.userId,
            workInfo: {
                workId: testResource.originInfo.id,
                workName: testResource.originInfo.name,
                resourceType: testResource.originInfo.resourceType,
                workType: testResource.originInfo.type === TestResourceOriginType.Resource ? WorkTypeEnum.IndividualResource : WorkTypeEnum.StorageObject,
                workOwnerId: 0,
                workOwnerName: testResource.originInfo.type === TestResourceOriginType.Resource ? first(testResource.originInfo.name.split('/')) : ''
            },
            status: 0
        };

        if (testResourceTreeInfo) {
            exhibitInfo.versionInfo = this.testResourceTreeInfoWrapToExhibitVersionInfo(testResource, testResourceTreeInfo);
        }

        return exhibitInfo;
    }

    /**
     * 测试资源版本信息生成
     * @param testResource
     * @param testResourceTreeInfo
     * @private
     */
    private testResourceTreeInfoWrapToExhibitVersionInfo(testResource: TestResourceInfo, testResourceTreeInfo?: TestResourceTreeInfo): ExhibitVersionInfo {
        return {
            exhibitId: testResource.testResourceId,
            version: testResource.originInfo.version,
            workId: testResource.originInfo.id,
            exhibitProperty: this.testNodeGenerator._calculateTestResourceProperty(testResource),
            authTree: TestResourceAdapter.testResourceAuthTreeWrapToExhibitDependencyNodeInfo(testResourceTreeInfo.authTree),
            dependencyTree: TestResourceAdapter.testResourceDependencyTreeWrapToExhibitDependencyNodeInfo(testResourceTreeInfo.dependencyTree)
        };
    }

    /**
     * 测试资源依赖树适配为exhibit依赖树
     * @param testResourceDependencyTree
     */
    static testResourceDependencyTreeWrapToExhibitDependencyNodeInfo(testResourceDependencyTree: FlattenTestResourceDependencyTree[]): ExhibitDependencyNodeInfo[] {
        return testResourceDependencyTree?.map(item => {
            return {
                nid: item.nid ?? '',
                workId: item.id,
                workName: item.name,
                workType: item.type === TestResourceOriginType.Resource ? WorkTypeEnum.IndividualResource : WorkTypeEnum.StorageObject,
                version: item.version,
                versionRange: '',
                resourceType: item.resourceType,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }

    /**
     * 测试资源授权树适配为exhibit授权树
     * @param testResourceAuthTree
     */
    static testResourceAuthTreeWrapToExhibitDependencyNodeInfo(testResourceAuthTree: FlattenTestResourceAuthTree[]): ExhibitAuthNodeInfo[] {
        return testResourceAuthTree?.map(item => {
            return {
                nid: item.nid,
                workId: item.id,
                workName: item.name,
                workType: item.type === TestResourceOriginType.Resource ? WorkTypeEnum.IndividualResource : WorkTypeEnum.StorageObject,
                resourceType: '',
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
}
