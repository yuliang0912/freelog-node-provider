export const development = {
    watchDirs: [
        'app',
        'controller',
        'lib',
        'service',
        'extend',
        'config',
        'app.ts',
        'agent.ts',
        'interface.ts',
    ],
    overrideDefault: true
};

export default () => {
    const config: any = {};

    config.middleware = ['errorAutoSnapHandler', 'gatewayIdentityInfoHandler', 'localIdentityInfoHandler'];
    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AMTAwZGRhODU0Njc2MTM%3D%40dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com%3A3717%2Cdds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com%3A3717%2Flocal-nodes%3FreplicaSet%3Dmgset-44484047`)
    };

    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com%3A3717%2Cdds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com%3A3717%2Ftest-nodes%3FreplicaSet%3Dmgset-44484047`)
    };
    config.gatewayUrl = 'http://api.testfreelog.com';


    // config.gatewayUrl = 'https://api.freelog.com';
    // config.mongoose = {
    //     url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40freelog-prod-public.mongodb.rds.aliyuncs.com%3A3717%2Cfreelog-prod-public-secondary.mongodb.rds.aliyuncs.com%3A3717%2Fprod-nodes%3FreplicaSet%3Dmgset-58730021`)
    // };

    config.localIdentity = {
        userId: 50028,
        username: 'yuliang',
        email: 'support@freelog.com'
    };

    config.kafka = {
        enable: false,
        clientId: 'freelog-node-service',
        logLevel: 1, // logLevel.ERROR,
        brokers: ['192.168.164.165:9090']
    };

    // config.kafka = {
    //     enable: true,
    //     clientId: 'freelog-node-service',
    //     logLevel: 1, // logLevel.ERROR,
    //     brokers: ['112.74.140.101:9093']
    // }

    return config;
};
