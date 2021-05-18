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
        userId: 50021,
        username: 'yuliang',
        email: 'support@freelog.com'
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmxvY2FsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbmZpZy9jb25maWcubG9jYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxXQUFXLEdBQUc7SUFDdkIsU0FBUyxFQUFFO1FBQ1AsS0FBSztRQUNMLFlBQVk7UUFDWixLQUFLO1FBQ0wsU0FBUztRQUNULFFBQVE7UUFDUixRQUFRO1FBQ1IsUUFBUTtRQUNSLFVBQVU7UUFDVixjQUFjO0tBQ2pCO0lBQ0QsZUFBZSxFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQUVGLGtCQUFlLEdBQUcsRUFBRTtJQUNoQixNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7SUFFdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDdkcsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSx5TUFBeU07S0FDak4sQ0FBQztJQUVGLHNCQUFzQjtJQUN0Qiw2T0FBNk87SUFDN08sS0FBSztJQUNMLG9EQUFvRDtJQUNwRCxzQkFBc0I7SUFDdEIsY0FBYztJQUNkLEtBQUs7SUFFTCxNQUFNLENBQUMsYUFBYSxHQUFHO1FBQ25CLE1BQU0sRUFBRSxLQUFLO1FBQ2IsUUFBUSxFQUFFLFNBQVM7UUFDbkIsS0FBSyxFQUFFLHFCQUFxQjtLQUMvQixDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=