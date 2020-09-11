import {controller, inject, get, post, provide} from 'midway';
import {INodeService} from '../../interface';
import {visitorIdentity} from '../../extend/vistorIdentityDecorator';
import {LoginUser, InternalClient} from 'egg-freelog-base/index';
// import {BaseTestRuleInfo, TestNodeOperationEnum, TestResourceOriginType} from "../../test-node-interface";

// import {isUndefined, isArray, isString} from 'lodash';

@provide()
@controller('/v2/testNodes')
export class TestNodeController {

    @inject()
    nodeService: INodeService;
    @inject()
    nodeCommonChecker;
    @inject()
    testRuleHandler;
    @inject()
    testNodeService;

    @get('/')
    @visitorIdentity(LoginUser | InternalClient)
    async show(ctx) {

        // const nodeId = ctx.checkParams('id').isInt().gt(0).value;
        ctx.validateParams()

        // const ruleInfos: BaseTestRuleInfo[] = [];
        // ruleInfos.push({
        //     text: "alter hello  do \\n set_tags tag1,tag2\\n   show\\nend",
        //     tags: ["tag1", "tag2"],
        //     replaces: [],
        //     online: true,
        //     operation: TestNodeOperationEnum.Alter,
        //     presentableName: "hello"
        // });
        // ruleInfos.push({
        //     text: "add  $yuliang/my-first-resource3@^1.0.0   as import_test_resource \\ndo\\nend",
        //     tags: ["tag1", "tag2"],
        //     replaces: [],
        //     online: null,
        //     operation: TestNodeOperationEnum.Add,
        //     presentableName: 'import_test_resource',
        //     candidate: {
        //         name: "yuliang/my-first-resource3",
        //         versionRange: "^1.0.0",
        //         type: TestResourceOriginType.Resource
        //     }
        // });
        // ruleInfos.push({
        //     text: "add   #yuliang/2a  as object_1 \\ndo  \\n  set_tags reset  \\n  replace #yuliang/readme2 with #yuliang/readme3  \\n   hide \\nend",
        //     tags: ["tag1", "tag2"],
        //     replaces: [
        //         {
        //             replaced: {
        //                 name: "yuliang/my-resource-1",
        //                 type: TestResourceOriginType.Resource
        //             },
        //             replacer: {
        //                 name: "yuliang/my-first-resource4",
        //                 type: TestResourceOriginType.Resource
        //             },
        //             scopes: []
        //         }
        //     ],
        //     online: null,
        //     operation: TestNodeOperationEnum.Add,
        //     presentableName: "object_1",
        //     candidate: {
        //         name: "yuliang/2a",
        //         type: TestResourceOriginType.Object
        //     }
        // });
        //
        // await this.testRuleHandler.main(80000000, ruleInfos).then(ctx.success);

        // await this.nodeTestRuleProvider.findOne({nodeId}).then(ctx.success)

        await this.testNodeService.matchAndSaveNodeTestRule(80000000, '').then(ctx.success);
    }

    @post('/')
    @visitorIdentity(LoginUser | InternalClient)
    async create(ctx) {

        // const nodeId = ctx.checkParams('id').isInt().gt(0).value;
        ctx.validateParams()

        // await this.nodeTestRuleProvider.findOne({nodeId}).then(ctx.success)
    }
}