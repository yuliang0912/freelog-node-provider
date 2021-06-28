"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthExceptionHandlerMiddleware = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let AuthExceptionHandlerMiddleware = class AuthExceptionHandlerMiddleware {
    resolve() {
        return async (ctx, next) => {
            try {
                await next();
            }
            catch (error) {
                console.log(error);
                if ((error instanceof egg_freelog_base_1.BreakOffError) || (error instanceof egg_freelog_base_1.AuthorizationError)) {
                    throw error;
                }
                ctx.requestContext.get('presentableAuthResponseHandler').subjectAuthProcessExceptionHandle(error);
            }
        };
    }
};
AuthExceptionHandlerMiddleware = __decorate([
    midway_1.provide()
], AuthExceptionHandlerMiddleware);
exports.AuthExceptionHandlerMiddleware = AuthExceptionHandlerMiddleware;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1leGNlcHRpb24taGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvbWlkZGxld2FyZS9hdXRoLWV4Y2VwdGlvbi1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUEwRDtBQUMxRCx1REFBbUU7QUFHbkUsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFFdkMsT0FBTztRQUVILE9BQU8sS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN2QixJQUFJO2dCQUNBLE1BQU0sSUFBSSxFQUFFLENBQUM7YUFDaEI7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNsQixJQUFJLENBQUMsS0FBSyxZQUFZLGdDQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxxQ0FBa0IsQ0FBQyxFQUFFO29CQUMzRSxNQUFNLEtBQUssQ0FBQztpQkFDZjtnQkFDRCxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3JHO1FBQ0wsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUVKLENBQUE7QUFqQlksOEJBQThCO0lBRDFDLGdCQUFPLEVBQUU7R0FDRyw4QkFBOEIsQ0FpQjFDO0FBakJZLHdFQUE4QiJ9