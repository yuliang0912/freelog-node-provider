"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    const config = {};
    config.cluster = {
        listen: { port: 7105 }
    };
    config.mongoose = {
        url: decodeURIComponent(`mongodb%3A%2F%2Fnode_service%3AQzA4Qzg3QTA3NDRCQTA0NDU1RUQxMjI3MTA4ODQ1MTk%3D%40freelog-prod-private.mongodb.rds.aliyuncs.com%3A3717%2Cfreelog-prod-private-secondary.mongodb.rds.aliyuncs.com%3A3717%2Fprod-nodes%3FreplicaSet%3Dmgset-58730021`)
    };
    config.kafka = {
        enable: true,
        clientId: 'freelog-node-service',
        logLevel: 1,
        brokers: ['kafka-0.production:9092', 'kafka-1.production:9092', 'kafka-2.production:9092'],
        connectionTimeout: 3000,
        retry: {
            initialRetryTime: 5000,
            retries: 20
        }
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnByb2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL2NvbmZpZy5wcm9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWUsR0FBRyxFQUFFO0lBQ2hCLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUV2QixNQUFNLENBQUMsT0FBTyxHQUFHO1FBQ2IsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQztLQUN2QixDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxrUEFBa1AsQ0FBQztLQUM5USxDQUFDO0lBRUYsTUFBTSxDQUFDLEtBQUssR0FBRztRQUNYLE1BQU0sRUFBRSxJQUFJO1FBQ1osUUFBUSxFQUFFLHNCQUFzQjtRQUNoQyxRQUFRLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxDQUFDLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixDQUFDO1FBQzFGLGlCQUFpQixFQUFFLElBQUk7UUFDdkIsS0FBSyxFQUFFO1lBQ0gsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixPQUFPLEVBQUUsRUFBRTtTQUNkO0tBQ0osQ0FBQztJQUVGLE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUMsQ0FBQyJ9