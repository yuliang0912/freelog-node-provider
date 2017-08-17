'use strict';

module.exports = appInfo => {

    const config = {
        /**
         * mongoDB配置
         */
        mongo: {
            uri: "mongodb://192.168.0.3:27017/node"
        },

        middleware: ['errorHandler', 'freelogServerAuth'],

        security: {
            xframe: {
                enable: false,
            },
            csrf: {
                enable: false,
            }
        },
    };

    // should change to your own
    config.keys = appInfo.name + '_1502781772068_5353';

    return config;
};
