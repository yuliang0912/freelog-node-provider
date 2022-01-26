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
        enable: false,
        clientId: 'freelog-node-service',
        logLevel: 1,
        brokers: ['kafka-svc.common:9093']
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnByb2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL2NvbmZpZy5wcm9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWUsR0FBRyxFQUFFO0lBQ2hCLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUV2QixNQUFNLENBQUMsT0FBTyxHQUFHO1FBQ2IsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQztLQUN2QixDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxrUEFBa1AsQ0FBQztLQUM5USxDQUFDO0lBRUYsTUFBTSxDQUFDLEtBQUssR0FBRztRQUNYLE1BQU0sRUFBRSxLQUFLO1FBQ2IsUUFBUSxFQUFFLHNCQUFzQjtRQUNoQyxRQUFRLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDO0tBQ3JDLENBQUM7SUFFRixPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUMifQ==