export default () => {
    const config: any = {};

    config.cluster = {
        listen: {port: 5105}
    };

    config.mongoose = {
        url: 'mongodb://mongo-test.common:27017/node-beta'
    };
    
    return config;
};
