"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rabbit_mq_queue_1 = require("./rabbit-mq-queue");
exports.default = (appInfo) => {
    const config = {};
    config.keys = appInfo.name;
    config.cluster = {
        listen: {
            port: 7105
        }
    };
    config.i18n = {
        enable: true,
        defaultLocale: 'zh-CN'
    };
    config.middleware = [
        'errorHandler', 'identityAuthentication'
    ];
    config.static = {
        enable: false
    };
    config.onerror = {
        all(err, ctx) {
            ctx.type = 'application/json';
            ctx.body = JSON.stringify({ ret: -1, msg: err.toString(), data: null });
            ctx.status = 500;
        }
    };
    config.security = {
        xframe: {
            enable: false,
        },
        csrf: {
            enable: false,
        }
    };
    config.clientCredentialInfo = {
        clientId: 1004,
        publicKey: 'c8724fd977542b155abac77664093770',
        privateKey: 'e8739ff716660a4c942724d306216612'
    };
    config.rabbitMq = {
        enable: false,
        connOptions: {
            host: '192.168.164.165',
            port: 5672,
            login: 'guest',
            password: 'guest',
            authMechanism: 'AMQPLAIN',
            heartbeat: 120 // 每2分钟保持一次连接
        },
        implOptions: {
            reconnect: true,
            reconnectBackoffTime: 20000 // 10秒尝试连接一次
        },
        exchange: {
            name: 'freelog-node-exchange',
        },
        queues: rabbit_mq_queue_1.queues
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmRlZmF1bHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL2NvbmZpZy5kZWZhdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsdURBQXlDO0FBRXpDLGtCQUFlLENBQUMsT0FBbUIsRUFBRSxFQUFFO0lBQ25DLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUV2QixNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFFM0IsTUFBTSxDQUFDLE9BQU8sR0FBRztRQUNiLE1BQU0sRUFBRTtZQUNKLElBQUksRUFBRSxJQUFJO1NBQ2I7S0FDSixDQUFDO0lBR0YsTUFBTSxDQUFDLElBQUksR0FBRztRQUNWLE1BQU0sRUFBRSxJQUFJO1FBQ1osYUFBYSxFQUFFLE9BQU87S0FDekIsQ0FBQztJQUVGLE1BQU0sQ0FBQyxVQUFVLEdBQUc7UUFDaEIsY0FBYyxFQUFFLHdCQUF3QjtLQUMzQyxDQUFDO0lBRUYsTUFBTSxDQUFDLE1BQU0sR0FBRztRQUNaLE1BQU0sRUFBRSxLQUFLO0tBQ2hCLENBQUM7SUFFRixNQUFNLENBQUMsT0FBTyxHQUFHO1FBQ2IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztZQUM5QixHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUN0RSxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNyQixDQUFDO0tBQ0osQ0FBQztJQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUc7UUFDZCxNQUFNLEVBQUU7WUFDSixNQUFNLEVBQUUsS0FBSztTQUNoQjtRQUNELElBQUksRUFBRTtZQUNGLE1BQU0sRUFBRSxLQUFLO1NBQ2hCO0tBQ0osQ0FBQztJQUVGLE1BQU0sQ0FBQyxvQkFBb0IsR0FBRztRQUMxQixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxrQ0FBa0M7UUFDN0MsVUFBVSxFQUFFLGtDQUFrQztLQUNqRCxDQUFDO0lBR0YsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLE1BQU0sRUFBRSxLQUFLO1FBQ2IsV0FBVyxFQUFFO1lBQ1QsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxPQUFPO1lBQ2QsUUFBUSxFQUFFLE9BQU87WUFDakIsYUFBYSxFQUFFLFVBQVU7WUFDekIsU0FBUyxFQUFFLEdBQUcsQ0FBRSxhQUFhO1NBQ2hDO1FBQ0QsV0FBVyxFQUFFO1lBQ1QsU0FBUyxFQUFFLElBQUk7WUFDZixvQkFBb0IsRUFBRSxLQUFLLENBQUUsWUFBWTtTQUM1QztRQUNELFFBQVEsRUFBRTtZQUNOLElBQUksRUFBRSx1QkFBdUI7U0FDaEM7UUFDRCxNQUFNLEVBQU4sd0JBQU07S0FDVCxDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=