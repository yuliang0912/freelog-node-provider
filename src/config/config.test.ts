export default () => {
    const config: any = {};

    config.cluster = {
        listen: {port: 5105}
    };

    config.mongoose = {
        url: `mongodb://node_service:QzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk=@dds-wz9ac40fee5c09441.mongodb.rds.aliyuncs.com:3717,dds-wz9ac40fee5c09442.mongodb.rds.aliyuncs.com:3717/test-nodes?replicaSet=mgset-44484047`,
    };

    config.kafka = {
        enable: true,
        clientId: 'freelog-node-service',
        logLevel: 1, // logLevel.ERROR,
        brokers: ['kafka-0.development:9092']
    };

    return config;
};
