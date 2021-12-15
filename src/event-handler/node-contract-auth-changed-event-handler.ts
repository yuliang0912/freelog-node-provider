import {EachMessagePayload} from 'kafkajs';
import {init, inject, provide, scope, ScopeEnum} from 'midway';
import {
    IContractAuthStatusChangedEventMessage, IKafkaSubscribeMessageHandle, PresentableInfo
} from '../interface';
import {ContractStatusEnum, IMongodbOperation} from 'egg-freelog-base';

@provide()
@scope(ScopeEnum.Singleton)
export class NodeContractAuthChangedEventHandler implements IKafkaSubscribeMessageHandle {

    consumerGroupId = 'freelog-node-service#contract-terminated-event-handler-group';
    subscribeTopicName = `node-contract-auth-status-changed-topic`;

    @inject()
    presentableProvider: IMongodbOperation<PresentableInfo>;

    @init()
    initial() {
        this.messageHandle = this.messageHandle.bind(this);
    }

    /**
     * 消息处理
     * @param payload
     */
    async messageHandle(payload: EachMessagePayload): Promise<void> {
        const message: IContractAuthStatusChangedEventMessage = JSON.parse(payload.message.value.toString());
        if (message.contractStatus !== ContractStatusEnum.Terminated) {
            return;
        }
        const presentableInfos = await this.presentableProvider.find({
            nodeId: parseInt(message.licenseeId.toString()), 'resolveResources.resourceId': message.subjectId
        }, 'presentableId resolveResources');
        console.log(payload.message.value.toString(), presentableInfos.length);
        const tasks = [];
        for (const presentableInfo of presentableInfos) {
            const resolveResource = presentableInfo.resolveResources.find(x => x.resourceId === message.subjectId);
            resolveResource.contracts = resolveResource.contracts.filter(x => x.contractId !== message.contractId);
            console.log(presentableInfo.presentableId, JSON.stringify(resolveResource), JSON.stringify(presentableInfo.resolveResources));
            tasks.push(this.presentableProvider.updateOne({presentableId: presentableInfo.presentableId}, {
                resolveResources: presentableInfo.resolveResources
            }));
        }
        await Promise.all(tasks);
    }
}
