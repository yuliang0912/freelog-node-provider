export const queues = [{
    name: 'node#presentable-auth-changed-queue',
    options: {autoDelete: false, durable: true},
    routingKeys: [
        {
            exchange: 'freelog-contract-exchange',
            routingKey: 'auth.presentable.authStatus.changed'
        }
    ]
}];
