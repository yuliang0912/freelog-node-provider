import { KafkaClient } from './client';
import { NodeContractAuthChangedEventHandler } from '../event-handler/node-contract-auth-changed-event-handler';
export declare class KafkaStartup {
    kafkaConfig: any;
    kafkaClient: KafkaClient;
    nodeContractAuthChangedEventHandler: NodeContractAuthChangedEventHandler;
    /**
     * 启动,连接kafka-producer,订阅topic
     */
    startUp(): Promise<void>;
    /**
     * 订阅
     */
    subscribeTopics(): Promise<void>;
}
