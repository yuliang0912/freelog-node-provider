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
    initial() {
        this.messageHandle = this.messageHandle.bind(this);
    }
    /**
     * 消息处理
     * @param payload
     */
    async messageHandle(payload) {
        const message = JSON.parse(payload.message.value.toString());
        console.log(payload.message.offset, message.subjectId, payload.message.key.toString());
        const presentableInfos = await this.presentableProvider.find({
            nodeId: parseInt(message.licenseeId.toString()), 'resolveResources.resourceId': message.subjectId
        }, 'presentableId resolveResources');
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
        return;
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], NodeContractAuthChangedEventHandler.prototype, "presentableProvider", void 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1jb250cmFjdC1hdXRoLWNoYW5nZWQtZXZlbnQtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ldmVudC1oYW5kbGVyL25vZGUtY29udHJhY3QtYXV0aC1jaGFuZ2VkLWV2ZW50LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQStEO0FBSS9ELHVEQUF1RTtBQUl2RSxJQUFhLG1DQUFtQyxHQUFoRCxNQUFhLG1DQUFtQztJQUU1QyxlQUFlLEdBQUcsOERBQThELENBQUM7SUFDakYsa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7SUFHL0QsbUJBQW1CLENBQXFDO0lBR3hELE9BQU87UUFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQTJCO1FBQzNDLE1BQU0sT0FBTyxHQUEyQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDckcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7WUFDekQsTUFBTSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxDQUFDLFNBQVM7U0FDcEcsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3JDLElBQUksT0FBTyxDQUFDLGNBQWMsS0FBSyxxQ0FBa0IsQ0FBQyxVQUFVLEVBQUU7WUFDMUQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxlQUFlLElBQUksZ0JBQWdCLEVBQUU7Z0JBQzVDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkcsZUFBZSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN2RyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLGFBQWEsRUFBQyxFQUFFO29CQUNoRixnQkFBZ0IsRUFBRSxlQUFlLENBQUMsZ0JBQWdCO2lCQUNyRCxDQUFDLENBQUMsQ0FBQzthQUNQO1lBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLE9BQU87U0FDVjtRQUNELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNqQixLQUFLLE1BQU0sZUFBZSxJQUFJLGdCQUFnQixFQUFFO1lBQzVDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2RyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlGLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQ2YsU0FBUzthQUNaO1lBQ0QsWUFBWSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQ2xELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsYUFBYSxFQUFDLEVBQUU7Z0JBQ2hGLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxnQkFBZ0I7YUFDckQsQ0FBQyxDQUFDLENBQUM7U0FDUDtRQUNELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixPQUFPO0lBQ1gsQ0FBQztDQUNKLENBQUE7QUE1Q0c7SUFEQyxJQUFBLGVBQU0sR0FBRTs7Z0ZBQytDO0FBR3hEO0lBREMsSUFBQSxhQUFJLEdBQUU7Ozs7a0VBR047QUFYUSxtQ0FBbUM7SUFGL0MsSUFBQSxnQkFBTyxHQUFFO0lBQ1QsSUFBQSxjQUFLLEVBQUMsa0JBQVMsQ0FBQyxTQUFTLENBQUM7R0FDZCxtQ0FBbUMsQ0FrRC9DO0FBbERZLGtGQUFtQyJ9