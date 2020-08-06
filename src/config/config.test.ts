export default () => {
    const config: any = {};

    config.cluster = {
        listen: {port: 5105}
    };

    config.mongoose = {
        url: 'mongodb://mongo-test.common:27017/node-beta'
    };

    config.rabbitMq = {
        connOptions: {
            host: 'rabbitmq-test.common',
            port: 5672,
            login: 'test_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    };

    return config;
};