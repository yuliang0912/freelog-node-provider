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
exports.TestNodeController = void 0;
const midway_1 = require("midway");
const vistorIdentityDecorator_1 = require("../../extend/vistorIdentityDecorator");
const index_1 = require("egg-freelog-base/index");
// import {BaseTestRuleInfo, TestNodeOperationEnum, TestResourceOriginType} from "../../test-node-interface";
// import {isUndefined, isArray, isString} from 'lodash';
let TestNodeController = class TestNodeController {
    async show(ctx) {
        // const nodeId = ctx.checkParams('id').isInt().gt(0).value;
        ctx.validateParams();
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
    async create(ctx) {
        // const nodeId = ctx.checkParams('id').isInt().gt(0).value;
        ctx.validateParams();
        // await this.nodeTestRuleProvider.findOne({nodeId}).then(ctx.success)
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testRuleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testNodeService", void 0);
__decorate([
    midway_1.get('/'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser | index_1.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "show", null);
__decorate([
    midway_1.post('/'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser | index_1.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "create", null);
TestNodeController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/testNodes')
], TestNodeController);
exports.TestNodeController = TestNodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBOEQ7QUFFOUQsa0ZBQXFFO0FBQ3JFLGtEQUFpRTtBQUNqRSw2R0FBNkc7QUFFN0cseURBQXlEO0FBSXpELElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBYTNCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRztRQUVWLDREQUE0RDtRQUM1RCxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUE7UUFFcEIsNENBQTRDO1FBQzVDLG1CQUFtQjtRQUNuQixzRUFBc0U7UUFDdEUsOEJBQThCO1FBQzlCLG9CQUFvQjtRQUNwQixvQkFBb0I7UUFDcEIsOENBQThDO1FBQzlDLCtCQUErQjtRQUMvQixNQUFNO1FBQ04sbUJBQW1CO1FBQ25CLDZGQUE2RjtRQUM3Riw4QkFBOEI7UUFDOUIsb0JBQW9CO1FBQ3BCLG9CQUFvQjtRQUNwQiw0Q0FBNEM7UUFDNUMsK0NBQStDO1FBQy9DLG1CQUFtQjtRQUNuQiw4Q0FBOEM7UUFDOUMsa0NBQWtDO1FBQ2xDLGdEQUFnRDtRQUNoRCxRQUFRO1FBQ1IsTUFBTTtRQUNOLG1CQUFtQjtRQUNuQixpSkFBaUo7UUFDakosOEJBQThCO1FBQzlCLGtCQUFrQjtRQUNsQixZQUFZO1FBQ1osMEJBQTBCO1FBQzFCLGlEQUFpRDtRQUNqRCx3REFBd0Q7UUFDeEQsaUJBQWlCO1FBQ2pCLDBCQUEwQjtRQUMxQixzREFBc0Q7UUFDdEQsd0RBQXdEO1FBQ3hELGlCQUFpQjtRQUNqQix5QkFBeUI7UUFDekIsWUFBWTtRQUNaLFNBQVM7UUFDVCxvQkFBb0I7UUFDcEIsNENBQTRDO1FBQzVDLG1DQUFtQztRQUNuQyxtQkFBbUI7UUFDbkIsOEJBQThCO1FBQzlCLDhDQUE4QztRQUM5QyxRQUFRO1FBQ1IsTUFBTTtRQUNOLEVBQUU7UUFDRiwwRUFBMEU7UUFFMUUsc0VBQXNFO1FBRXRFLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBSUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1FBRVosNERBQTREO1FBQzVELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUVwQixzRUFBc0U7SUFDMUUsQ0FBQztDQUNKLENBQUE7QUE5RUc7SUFEQyxlQUFNLEVBQUU7O3VEQUNpQjtBQUUxQjtJQURDLGVBQU0sRUFBRTs7NkRBQ1M7QUFFbEI7SUFEQyxlQUFNLEVBQUU7OzJEQUNPO0FBRWhCO0lBREMsZUFBTSxFQUFFOzsyREFDTztBQUloQjtJQUZDLFlBQUcsQ0FBQyxHQUFHLENBQUM7SUFDUix5Q0FBZSxDQUFDLGlCQUFTLEdBQUcsc0JBQWMsQ0FBQzs7Ozs4Q0EwRDNDO0FBSUQ7SUFGQyxhQUFJLENBQUMsR0FBRyxDQUFDO0lBQ1QseUNBQWUsQ0FBQyxpQkFBUyxHQUFHLHNCQUFjLENBQUM7Ozs7Z0RBTzNDO0FBaEZRLGtCQUFrQjtJQUY5QixnQkFBTyxFQUFFO0lBQ1QsbUJBQVUsQ0FBQyxlQUFlLENBQUM7R0FDZixrQkFBa0IsQ0FpRjlCO0FBakZZLGdEQUFrQiJ9