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

    // config.gatewayUrl = 'http://api.testfreelog.com'
    // config.mongoose = {
    //     url: 'mongodb://39.108.77.211:30772/node-beta'
    // };

    config.localIdentity = {
        userId: 50021,
        username: 'yuliang',
        email: 'support@freelog.com'
    };

    return config;
};
