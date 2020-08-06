"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queues = void 0;
exports.queues = [{
        name: 'node#presentable-auth-changed-queue',
        options: { autoDelete: false, durable: true },
        routingKeys: [
            {
                exchange: 'freelog-contract-exchange',
                routingKey: 'auth.presentable.authStatus.changed'
            }
        ]
    }];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFiYml0LW1xLXF1ZXVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbmZpZy9yYWJiaXQtbXEtcXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxNQUFNLEdBQUcsQ0FBQztRQUNuQixJQUFJLEVBQUUscUNBQXFDO1FBQzNDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQztRQUMzQyxXQUFXLEVBQUU7WUFDVDtnQkFDSSxRQUFRLEVBQUUsMkJBQTJCO2dCQUNyQyxVQUFVLEVBQUUscUNBQXFDO2FBQ3BEO1NBQ0o7S0FDSixDQUFDLENBQUMifQ==