import { EachMessagePayload } from 'kafkajs';
import { IContractAuthStatusChangedEventMessage, IKafkaSubscribeMessageHandle, PresentableInfo } from '../interface';
import { IMongodbOperation } from 'egg-freelog-base';
import { TestResourceInfo } from '../test-node-interface';
export declare class NodeContractAuthChangedEventHandler implements IKafkaSubscribeMessageHandle {
    consumerGroupId: string;
    subscribeTopicName: string;
    presentableProvider: IMongodbOperation<PresentableInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    initial(): void;
    /**
     * 消息处理
     * @param payload
     */
    messageHandle(payload: EachMessagePayload): Promise<void>;
    /**
     * 展品解决的合约处理
     * @param message
     */
    presentableResolveResourceHandle(message: IContractAuthStatusChangedEventMessage): Promise<void>;
    /**
     * 测试资源所解决的合约
     * @param message
     */
    testResourceResolveResourceHandle(message: IContractAuthStatusChangedEventMessage): Promise<void>;
}
