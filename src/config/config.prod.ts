export default () => {
    const config: any = {};

    config.cluster = {
        listen: {port: 7105}
    };

    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40freelog-prod-private.mongodb.rds.aliyuncs.com%3A3717%2Cfreelog-prod-private-secondary.mongodb.rds.aliyuncs.com%3A3717%2Fprod-nodes%3FreplicaSet%3Dmgset-58730021`)
    };

    config.kafka = {
        enable: true,
        clientId: 'freelog-node-service',
        logLevel: 1, // logLevel.ERROR,
        brokers: ['kafka-0.production:9092', 'kafka-1.production:9092', 'kafka-2.production:9092'],
        connectionTimeout: 3000,
        retry: {
            initialRetryTime: 5000,
            retries: 20
        }
    };

    return config;
};
