import {init, inject, provide} from 'midway';
import {
    Action, ActionOperationEnum, ContentDeleteAttr, ContentReplace, ContentSetAttr, ContentSetCover,
    ContentSetLabel, ContentSetOnline, ContentSetTitle,
    IActionHandler, TestRuleMatchInfo
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';

@provide()
export class ActionHandler implements IActionHandler<any> {

    @inject()
    actionReplaceHandler: IActionHandler<ContentReplace>;
    @inject()
    actionSetAttrHandler: IActionHandler<ContentSetAttr>;
    @inject()
    actionSetTagsHandler: IActionHandler<ContentSetLabel>;
    @inject()
    actionSetTitleHandler: IActionHandler<ContentSetTitle>;
    @inject()
    actionSetCoverHandler: IActionHandler<ContentSetCover>;
    @inject()
    actionDeleteAttrHandler: IActionHandler<ContentDeleteAttr>;
    @inject()
    actionSetOnlineStatusHandler: IActionHandler<ContentSetOnline>;

    actionHandlerMap = new Map<ActionOperationEnum, IActionHandler<any>>();

    @init()
    __initActionHandler__() {
        this.actionHandlerMap.set(ActionOperationEnum.AddAttr, this.actionSetAttrHandler);
        this.actionHandlerMap.set(ActionOperationEnum.DeleteAttr, this.actionDeleteAttrHandler);
        this.actionHandlerMap.set(ActionOperationEnum.Online, this.actionSetOnlineStatusHandler);
        this.actionHandlerMap.set(ActionOperationEnum.SetCover, this.actionSetCoverHandler);
        this.actionHandlerMap.set(ActionOperationEnum.SetLabels, this.actionSetTagsHandler);
        this.actionHandlerMap.set(ActionOperationEnum.SetTitle, this.actionSetTitleHandler);
        this.actionHandlerMap.set(ActionOperationEnum.Replace, this.actionReplaceHandler);
    }

    /**
     * 映射规则指令处理
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<any>): Promise<boolean> {

        if (!testRuleInfo.isValid || !this.actionHandlerMap.has(action.operation)) {
            return false;
        }

        const result = await this.actionHandlerMap.get(action.operation).handle(ctx, testRuleInfo, action);
        if (result) {
            let currentOperationEfficientInfo = testRuleInfo.efficientInfos.find(x => x.type === action.operation);
            if (!currentOperationEfficientInfo) {
                currentOperationEfficientInfo = {type: action.operation, count: 1};
                testRuleInfo.efficientInfos.push(currentOperationEfficientInfo);
            } else {
                currentOperationEfficientInfo.count += 1;
            }
        }
        return result;

        // switch (action.operation) {
        //     case ActionOperationEnum.AddAttr:
        //         return this.actionSetAttrHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.DeleteAttr:
        //         return this.actionDeleteAttrHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.Online:
        //         return this.actionSetOnlineStatusHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetCover:
        //         return this.actionSetCoverHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetLabels:
        //         return this.actionSetTagsHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetTitle:
        //         return this.actionSetTitleHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.Replace:
        //         return this.actionReplaceHandler.handle(ctx, testRuleInfo, action);
        //     default:
        //         return true;
        // }
    }
}
