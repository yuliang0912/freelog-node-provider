"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectAuthResult = void 0;
/**
 * 授权码规则:
 * 以2开头的代表通过授权,例如200,201,202
 * 以3开头的代表标的物的合同方面存在问题或未通过授权
 * 以4开头的代表标的物本身存在问题,例如为找到标的物、标的物状态不对等错误
 * 以5开头的代表甲方或乙方存在问题,例如节点被冻结、未登陆(乙方用户认证失败)非法请求等错误
 * 以9开头代表API内部异常,例如内部API调用失败、代码异常、参数不全等错误
 */
const egg_freelog_base_1 = require("egg-freelog-base");
class SubjectAuthResult {
    constructor(authCode) {
        this.data = null;
        this.errorMsg = '';
        this.authCode = egg_freelog_base_1.SubjectAuthCodeEnum.Default;
        this.referee = egg_freelog_base_1.SubjectTypeEnum.Presentable;
        if (authCode) {
            this.authCode = authCode;
        }
    }
    setErrorMsg(errorMsg) {
        this.errorMsg = errorMsg;
        return this;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    setReferee(subjectType) {
        this.referee = subjectType;
        return this;
    }
    setAuthCode(authCode) {
        this.authCode = authCode;
        return this;
    }
    get isAuth() {
        return this.authCode >= 200 && this.authCode < 300;
    }
    toJSON() {
        return {
            referee: this.referee,
            authCode: this.authCode,
            isAuth: this.isAuth,
            data: this.data,
            errorMsg: this.errorMsg
        };
    }
}
exports.SubjectAuthResult = SubjectAuthResult;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1pbnRlcmZhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXV0aC1pbnRlcmZhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILHVEQUEwRjtBQUUxRixNQUFhLGlCQUFpQjtJQU8xQixZQUFZLFFBQThCO1FBTDFDLFNBQUksR0FBRyxJQUFJLENBQUM7UUFDWixhQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2QsYUFBUSxHQUFHLHNDQUFtQixDQUFDLE9BQU8sQ0FBQztRQUN2QyxZQUFPLEdBQUcsa0NBQWUsQ0FBQyxXQUFXLENBQUM7UUFHbEMsSUFBSSxRQUFRLEVBQUU7WUFDVixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztTQUM1QjtJQUNMLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFTO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxXQUE0QjtRQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQTZCO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDTixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTztZQUNILE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtTQUMxQixDQUFBO0lBQ0wsQ0FBQztDQUNKO0FBOUNELDhDQThDQyJ9