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
exports.NodeContractAuthChangedEventHandler = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let NodeContractAuthChangedEventHandler = class NodeContractAuthChangedEventHandler {
    consumerGroupId = 'freelog-node-service#contract-terminated-event-handler-group';
    subscribeTopicName = `node-contract-auth-status-changed-topic`;
    presentableProvider;
    nodeTestResourceProvider;
    initial() {
        this.messageHandle = this.messageHandle.bind(this);
    }
    /**
     * 消息处理
     * @param payload
     */
    async messageHandle(payload) {
        const message = JSON.parse(payload.message.value.toString());
        const task1 = this.presentableResolveResourceHandle(message);
        const task2 = this.testResourceResolveResourceHandle(message);
        await Promise.all([task1, task2]);
    }
    /**
     * 展品解决的合约处理
     * @param message
     */
    async presentableResolveResourceHandle(message) {
        const presentableInfos = await this.presentableProvider.find({
            nodeId: parseInt(message.licenseeId.toString()), 'resolveResources.resourceId': message.subjectId
        }, 'resolveResources');
        if (message.contractStatus === egg_freelog_base_1.ContractStatusEnum.Terminated) {
            const tasks = [];
            for (const presentableInfo of presentableInfos) {
                const resolveResource = presentableInfo.resolveResources.find(x => x.resourceId === message.subjectId);
                resolveResource.contracts = resolveResource.contracts.filter(x => x.contractId !== message.contractId);
                tasks.push(this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, {
                    resolveResources: presentableInfo.resolveResources
                }));
            }
            await Promise.all(tasks);
            return;
        }
        const tasks = [];
        for (const presentableInfo of presentableInfos) {
            const resolveResource = presentableInfo.resolveResources.find(x => x.resourceId === message.subjectId);
            const contractInfo = resolveResource.contracts.find(x => x.contractId === message.contractId);
            if (!contractInfo) {
                continue;
            }
            contractInfo.authStatus = message.afterAuthStatus;
            tasks.push(this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, {
                resolveResources: presentableInfo.resolveResources
            }));
        }
        await Promise.all(tasks);
    }
    /**
     * 测试资源所解决的合约
     * @param message
     */
    async testResourceResolveResourceHandle(message) {
        if (message.contractStatus !== egg_freelog_base_1.ContractStatusEnum.Terminated) {
            return;
        }
        const testResources = await this.nodeTestResourceProvider.find({
            nodeId: parseInt(message.licenseeId.toString()), 'resolveResources.resourceId': message.subjectId
        }, 'testResourceId resolveResources');
        const tasks = [];
        for (const testResource of testResources) {
            const resolveResource = testResource.resolveResources.find(x => x.resourceId === message.subjectId);
            resolveResource.contracts = resolveResource.contracts.filter(x => x.contractId !== message.contractId);
            tasks.push(this.nodeTestResourceProvider.updateOne({ testResourceId: testResource.testResourceId }, {
                resolveResources: testResource.resolveResources
            }));
        }
        await Promise.all(tasks);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeContractAuthChangedEventHandler.prototype, "presentableProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeContractAuthChangedEventHandler.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    (0, midway_1.init)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NodeContractAuthChangedEventHandler.prototype, "initial", null);
NodeContractAuthChangedEventHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(midway_1.ScopeEnum.Singleton)
], NodeContractAuthChangedEventHandler);
exports.NodeContractAuthChangedEventHandler = NodeContractAuthChangedEventHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1jb250cmFjdC1hdXRoLWNoYW5nZWQtZXZlbnQtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ldmVudC1oYW5kbGVyL25vZGUtY29udHJhY3QtYXV0aC1jaGFuZ2VkLWV2ZW50LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQStEO0FBSS9ELHVEQUF1RTtBQUt2RSxJQUFhLG1DQUFtQyxHQUFoRCxNQUFhLG1DQUFtQztJQUU1QyxlQUFlLEdBQUcsOERBQThELENBQUM7SUFDakYsa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7SUFHL0QsbUJBQW1CLENBQXFDO0lBRXhELHdCQUF3QixDQUFzQztJQUc5RCxPQUFPO1FBQ0gsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUEyQjtRQUMzQyxNQUFNLE9BQU8sR0FBMkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUErQztRQUNsRixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUN6RCxNQUFNLEVBQUUsUUFB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