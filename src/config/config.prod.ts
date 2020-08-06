export default () => {
    const config: any = {};

    config.mongoose = {
        url: 'mongodb://mongo-prod.common:27017/node-beta'
    };

    config.rabbitMq = {
        connOptions: {
            host: 'rabbitmq-prod.common',
            port: 5672,
            login: 'prod_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        }
    };

    return config;
};