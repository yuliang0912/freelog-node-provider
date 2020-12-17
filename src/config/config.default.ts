import {EggAppInfo} from 'midway';
import {queues} from './rabbit-mq-queue';

export default (appInfo: EggAppInfo) => {
    const config: any = {};

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
            ctx.body = JSON.stringify({ret: -1, msg: err.toString(), data: null});
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
        enable: false, // 先不启用
        connOptions: {
            host: '192.168.164.165',
            port: 5672,
            login: 'guest',
            password: 'guest',
            authMechanism: 'AMQPLAIN',
            heartbeat: 120  // 每2分钟保持一次连接
        },
        implOptions: {
            reconnect: true,
            reconnectBackoffTime: 20000  // 10秒尝试连接一次
        },
        exchange: {
            name: 'freelog-node-exchange',
        },
        queues
    };

    return config;
};
