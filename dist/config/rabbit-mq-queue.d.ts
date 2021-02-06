export declare const queues: {
    name: string;
    options: {
        autoDelete: boolean;
        durable: boolean;
    };
    routingKeys: {
        exchange: string;
        routingKey: string;
    }[];
}[];
