import {
    ExhibitAuthNodeInfo,
    ExhibitDependencyNodeInfo,
    ExhibitInfo,
    ExhibitVersionInfo
} from '../../interface';
import {SubjectTypeEnum} from 'egg-freelog-base';
import {ArticleTypeEnum} from '../../enum';
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
            coverImages: testResource.originInfo.coverImages,
            version: testResource.originInfo.version,
            policies: [],
            onlineStatus: testResource.stateInfo.onlineStatusInfo?.onlineStatus ?? 1,
            nodeId: testResource.nodeId,
            userId: testResource.userId,
            articleInfo: {
                articleId: testResource.originInfo.id,
                articleName: testResource.originInfo.name,
                resourceType: testResource.originInfo.resourceType,
                articleType: testResource.originInfo.type === TestResourceOriginType.Resource ? ArticleTypeEnum.IndividualResource : ArticleTypeEnum.StorageObject,
                articleOwnerId: 0,
                articleOwnerName: testResource.originInfo.type === TestResourceOriginType.Resource ? first(testResource.originInfo.name.split('/')) : ''
            },
            status: 0,
            createDate: testResource.createDate,
            updateDate: testResource.updateDate
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
            articleId: testResource.originInfo.id,
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
                articleId: item.id,
                articleName: item.name,
                articleType: item.type === TestResourceOriginType.Resource ? ArticleTypeEnum.IndividualResource : ArticleTypeEnum.StorageObject,
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
                articleId: item.id,
                articleName: item.name,
                articleType: item.type === TestResourceOriginType.Resource ? ArticleTypeEnum.IndividualResource : ArticleTypeEnum.StorageObject,
                resourceType: '',
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
}
