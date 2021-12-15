import { EachMessagePayload } from 'kafkajs';
import { IKafkaSubscribeMessageHandle, PresentableInfo } from '../interface';
import { IMongodbOperation } from 'egg-freelog-base';
export declare class NodeContractAuthChangedEventHandler implements IKafkaSubscribeMessageHandle {
    consumerGroupId: string;
    subscribeTopicName: string;
    presentableProvider: IMongodbOperation<PresentableInfo>;
    initial(): void;
    /**
     * 消息处理
     * @param payload
     */
    messageHandle(payload: EachMessagePayload): Promise<void>;
}
