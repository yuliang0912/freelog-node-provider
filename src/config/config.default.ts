import {EggAppInfo} from 'midway';

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
        queryField: 'locale',
        cookieField: 'locale',
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
