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
        url: `mongodb://node_service:MTAwZGRhODU0Njc2MTM=@dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com:3717/local-nodes?replicaSet=mgset-44484047`
    };

    // config.mongoose = {
    //     url: `mongodb://node_service:QzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk=@dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com:3717/test-nodes?replicaSet=mgset-44484047`,
    // };
    // config.gatewayUrl = 'http://api.testfreelog.com';
    // config.mongoose = {
    //     url: ''
    // };

    config.localIdentity = {
        userId: 50031,
        username: 'yuliang',
        email: 'support@freelog.com'
    };

    return config;
};
