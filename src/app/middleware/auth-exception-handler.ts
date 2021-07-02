import {Middleware, WebMiddleware, provide} from 'midway';
import {AuthorizationError, BreakOffError} from 'egg-freelog-base';

@provide()
export class AuthExceptionHandlerMiddleware implements WebMiddleware {

    resolve(): Middleware {

        return async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                console.log(error)
                if ((error instanceof BreakOffError) || (error instanceof AuthorizationError)) {
                    throw error;
                }
                ctx.requestContext.get('presentableAuthResponseHandler').subjectAuthProcessExceptionHandle(error);
            }
        };
    }

}
