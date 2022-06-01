"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    config.middleware = ['errorAutoSnapHandler', 'gatewayIdentityInfoHandler'];
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
    config.httpclient = {
        request: {
            timeout: 30000,
        },
    };
    config.clientCredentialInfo = {
        clientId: 1004,
        publicKey: 'c8724fd977542b155abac77664093770',
        privateKey: 'e8739ff716660a4c942724d306216612'
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmRlZmF1bHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL2NvbmZpZy5kZWZhdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsa0JBQWUsQ0FBQyxPQUFtQixFQUFFLEVBQUU7SUFDbkMsTUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBRXZCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztJQUUzQixNQUFNLENBQUMsT0FBTyxHQUFHO1FBQ2IsTUFBTSxFQUFFO1lBQ0osSUFBSSxFQUFFLElBQUk7U0FDYjtLQUNKLENBQUM7SUFFRixNQUFNLENBQUMsSUFBSSxHQUFHO1FBQ1YsTUFBTSxFQUFFLElBQUk7UUFDWixhQUFhLEVBQUUsT0FBTztLQUN6QixDQUFDO0lBRUYsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFFM0UsTUFBTSxDQUFDLE1BQU0sR0FBRztRQUNaLE1BQU0sRUFBRSxLQUFLO0tBQ2hCLENBQUM7SUFFRixNQUFNLENBQUMsT0FBTyxHQUFHO1FBQ2IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztZQUM5QixHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUN0RSxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNyQixDQUFDO0tBQ0osQ0FBQztJQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUc7UUFDZCxNQUFNLEVBQUU7WUFDSixNQUFNLEVBQUUsS0FBSztTQUNoQjtRQUNELElBQUksRUFBRTtZQUNGLE1BQU0sRUFBRSxLQUFLO1NBQ2hCO0tBQ0osQ0FBQztJQUVGLE1BQU0sQ0FBQyxVQUFVLEdBQUc7UUFDaEIsT0FBTyxFQUFFO1lBQ0wsT0FBTyxFQUFFLEtBQUs7U0FDakI7S0FDSixDQUFDO0lBRUYsTUFBTSxDQUFDLG9CQUFvQixHQUFHO1FBQzFCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLGtDQUFrQztRQUM3QyxVQUFVLEVBQUUsa0NBQWtDO0tBQ2pELENBQUM7SUFFRixPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUMifQ==