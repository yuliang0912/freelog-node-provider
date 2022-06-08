"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.development = void 0;
exports.development = {
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
exports.default = () => {
    const config = {};
    config.middleware = ['errorAutoSnapHandler', 'gatewayIdentityInfoHandler', 'localIdentityInfoHandler'];
    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AMTAwZGRhODU0Njc2MTM%3D%40dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com%3A3717%2Cdds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com%3A3717%2Flocal-nodes%3FreplicaSet%3Dmgset-44484047`)
    };
    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40dds-wz9ac40fee5c09441604-pub.mongodb.rds.aliyuncs.com%3A3717%2Cdds-wz9ac40fee5c09442584-pub.mongodb.rds.aliyuncs.com%3A3717%2Ftest-nodes%3FreplicaSet%3Dmgset-44484047`)
    };
    config.gatewayUrl = 'http://api.testfreelog.com';
    config.gatewayUrl = 'https://api.freelog.com';
    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40freelog-prod-public.mongodb.rds.aliyuncs.com%3A3717%2Cfreelog-prod-public-secondary.mongodb.rds.aliyuncs.com%3A3717%2Fprod-nodes%3FreplicaSet%3Dmgset-58730021`)
    };
    config.localIdentity = {
        userId: 10005,
        username: 'yuliang',
        email: 'support@freelog.com'
    };
    config.kafka = {
        enable: false,
        clientId: 'freelog-node-service',
        logLevel: 1,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmxvY2FsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbmZpZy9jb25maWcubG9jYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxXQUFXLEdBQUc7SUFDdkIsU0FBUyxFQUFFO1FBQ1AsS0FBSztRQUNMLFlBQVk7UUFDWixLQUFLO1FBQ0wsU0FBUztRQUNULFFBQVE7UUFDUixRQUFRO1FBQ1IsUUFBUTtRQUNSLFVBQVU7UUFDVixjQUFjO0tBQ2pCO0lBQ0QsZUFBZSxFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQUVGLGtCQUFlLEdBQUcsRUFBRTtJQUNoQixNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7SUFFdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDdkcsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxpT0FBaU8sQ0FBQztLQUM3UCxDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyx3UEFBd1AsQ0FBQztLQUNwUixDQUFDO0lBQ0YsTUFBTSxDQUFDLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQztJQUdqRCxNQUFNLENBQUMsVUFBVSxHQUFHLHlCQUF5QixDQUFDO0lBQzlDLE1BQU0sQ0FBQyxRQUFRLEdBQUc7UUFDZCxHQUFHLEVBQUUsa0JBQWtCLENBQUMsZ1BBQWdQLENBQUM7S0FDNVEsQ0FBQztJQUVGLE1BQU0sQ0FBQyxhQUFhLEdBQUc7UUFDbkIsTUFBTSxFQUFFLEtBQUs7UUFDYixRQUFRLEVBQUUsU0FBUztRQUNuQixLQUFLLEVBQUUscUJBQXFCO0tBQy9CLENBQUM7SUFFRixNQUFNLENBQUMsS0FBSyxHQUFHO1FBQ1gsTUFBTSxFQUFFLEtBQUs7UUFDYixRQUFRLEVBQUUsc0JBQXNCO1FBQ2hDLFFBQVEsRUFBRSxDQUFDO1FBQ1gsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUM7S0FDcEMsQ0FBQztJQUVGLG1CQUFtQjtJQUNuQixvQkFBb0I7SUFDcEIsd0NBQXdDO0lBQ3hDLHNDQUFzQztJQUN0Qyx1Q0FBdUM7SUFDdkMsSUFBSTtJQUVKLE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUMsQ0FBQyJ9