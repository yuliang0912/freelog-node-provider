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
const index_1 = require("egg-freelog-base/index");
let AuthExceptionHandlerMiddleware = class AuthExceptionHandlerMiddleware {
    resolve() {
        return async (ctx, next) => {
            try {
                await next();
            }
            catch (error) {
                console.log(error);
                if (error instanceof index_1.AuthorizationError) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1leGNlcHRpb24taGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvbWlkZGxld2FyZS9hdXRoLWV4Y2VwdGlvbi1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUEwRDtBQUMxRCxrREFBMEQ7QUFHMUQsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFFdkMsT0FBTztRQUVILE9BQU8sS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN2QixJQUFJO2dCQUNBLE1BQU0sSUFBSSxFQUFFLENBQUM7YUFDaEI7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQixJQUFJLEtBQUssWUFBWSwwQkFBa0IsRUFBRTtvQkFDckMsTUFBTSxLQUFLLENBQUM7aUJBQ2Y7Z0JBQ0QsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNyRztRQUNMLENBQUMsQ0FBQztJQUNOLENBQUM7Q0FFSixDQUFBO0FBakJZLDhCQUE4QjtJQUQxQyxnQkFBTyxFQUFFO0dBQ0csOEJBQThCLENBaUIxQztBQWpCWSx3RUFBOEIifQ==