import {Middleware, WebMiddleware, provide} from 'midway';
import {AuthorizationError} from 'egg-freelog-base/index';

@provide()
export class AuthExceptionHandlerMiddleware implements WebMiddleware {

    resolve(): Middleware {

        return async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                if (error instanceof AuthorizationError) {
                    throw error;
                }
                ctx.requestContext.get('presentableAuthResponseHandler').subjectAuthProcessExceptionHandle(error);
            }
        };
    }

}