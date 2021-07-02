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
    config.localIdentity = {
        userId: 50028,
        username: 'yuliang',
        email: 'support@freelog.com'
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmxvY2FsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbmZpZy9jb25maWcubG9jYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxXQUFXLEdBQUc7SUFDdkIsU0FBUyxFQUFFO1FBQ1AsS0FBSztRQUNMLFlBQVk7UUFDWixLQUFLO1FBQ0wsU0FBUztRQUNULFFBQVE7UUFDUixRQUFRO1FBQ1IsUUFBUTtRQUNSLFVBQVU7UUFDVixjQUFjO0tBQ2pCO0lBQ0QsZUFBZSxFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQUVGLGtCQUFlLEdBQUcsRUFBRTtJQUNoQixNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7SUFFdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDdkcsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxpT0FBaU8sQ0FBQztLQUM3UCxDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyx3UEFBd1AsQ0FBQztLQUNwUixDQUFDO0lBQ0YsTUFBTSxDQUFDLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQztJQUVqRCxNQUFNLENBQUMsYUFBYSxHQUFHO1FBQ25CLE1BQU0sRUFBRSxLQUFLO1FBQ2IsUUFBUSxFQUFFLFNBQVM7UUFDbkIsS0FBSyxFQUFFLHFCQUFxQjtLQUMvQixDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=