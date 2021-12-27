import { Action, ActionOperationEnum, ContentDeleteAttr, ContentReplace, ContentSetAttr, ContentSetCover, ContentSetLabel, ContentSetOnline, ContentSetTitle, IActionHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionHandler implements IActionHandler<any> {
    actionReplaceHandler: IActionHandler<ContentReplace>;
    actionSetAttrHandler: IActionHandler<ContentSetAttr>;
    actionSetTagsHandler: IActionHandler<ContentSetLabel>;
    actionSetTitleHandler: IActionHandler<ContentSetTitle>;
    actionSetCoverHandler: IActionHandler<ContentSetCover>;
    actionDeleteAttrHandler: IActionHandler<ContentDeleteAttr>;
    actionSetOnlineStatusHandler: IActionHandler<ContentSetOnline>;
    actionHandlerMap: Map<ActionOperationEnum, IActionHandler<any>>;
    __initActionHandler__(): void;
    /**
     * 映射规则指令处理
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<any>): Promise<boolean>;
}
