import {Middleware, WebMiddleware, provide} from 'midway';
import {AuthorizationError, BreakOffError} from 'egg-freelog-base/index';

@provide()
export class AuthExceptionHandlerMiddleware implements WebMiddleware {

    resolve(): Middleware {

        return async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                if ((error instanceof BreakOffError) || (error instanceof AuthorizationError)) {
                    throw error;
                }
                ctx.requestContext.get('presentableAuthResponseHandler').subjectAuthProcessExceptionHandle(error);
            }
        };
    }

}
