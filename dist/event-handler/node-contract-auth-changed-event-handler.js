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
        // console.log(payload.message.offset, payload.message.key.toString());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1jb250cmFjdC1hdXRoLWNoYW5nZWQtZXZlbnQtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ldmVudC1oYW5kbGVyL25vZGUtY29udHJhY3QtYXV0aC1jaGFuZ2VkLWV2ZW50LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQStEO0FBSS9ELHVEQUF1RTtBQUl2RSxJQUFhLG1DQUFtQyxHQUFoRCxNQUFhLG1DQUFtQztJQUU1QyxlQUFlLEdBQUcsOERBQThELENBQUM7SUFDakYsa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7SUFHL0QsbUJBQW1CLENBQXFDO0lBR3hELE9BQU87UUFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQTJCO1FBQzNDLE1BQU0sT0FBTyxHQUEyQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDckcsdUVBQXVFO1FBQ3ZFLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQ3pELE1BQU0sRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLDZCQUE2QixFQUFFLE9BQU8sQ0FBQyxTQUFTO1NBQ3BHLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUNyQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEtBQUsscUNBQWtCLENBQUMsVUFBVSxFQUFFO1lBQzFELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU0sZUFBZSxJQUFJLGdCQUFnQixFQUFFO2dCQUM1QyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3ZHLGVBQWUsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDdkcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxhQUFhLEVBQUMsRUFBRTtvQkFDaEYsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLGdCQUFnQjtpQkFDckQsQ0FBQyxDQUFDLENBQUM7YUFDUDtZQUNELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPO1NBQ1Y7UUFDRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxNQUFNLGVBQWUsSUFBSSxnQkFBZ0IsRUFBRTtZQUM1QyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkcsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUNmLFNBQVM7YUFDWjtZQUNELFlBQVksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLGFBQWEsRUFBQyxFQUFFO2dCQUNoRixnQkFBZ0IsRUFBRSxlQUFlLENBQUMsZ0JBQWdCO2FBQ3JELENBQUMsQ0FBQyxDQUFDO1NBQ1A7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsT0FBTztJQUNYLENBQUM7Q0FDSixDQUFBO0FBNUNHO0lBREMsSUFBQSxlQUFNLEdBQUU7O2dGQUMrQztBQUd4RDtJQURDLElBQUEsYUFBSSxHQUFFOzs7O2tFQUdOO0FBWFEsbUNBQW1DO0lBRi9DLElBQUEsZ0JBQU8sR0FBRTtJQUNULElBQUEsY0FBSyxFQUFDLGtCQUFTLENBQUMsU0FBUyxDQUFDO0dBQ2QsbUNBQW1DLENBa0QvQztBQWxEWSxrRkFBbUMifQ==