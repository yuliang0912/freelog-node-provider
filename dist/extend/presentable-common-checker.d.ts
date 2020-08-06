import { IPresentableService } from '../interface';
export declare class PresentableCommonChecker {
    ctx: any;
    presentableService: IPresentableService;
    checkResourceIsCreated(nodeId: number, resourceId: string): Promise<void>;
    /**
     * 系统自动生成presentableName,如果不存在名称,则直接默认使用资源名称,否则会在后面递增追加序号
     * @param nodeId
     * @param resourceName
     * @returns {Promise<any>}
     */
    buildPresentableName(nodeId: number, presentableName: string): Promise<string>;
}
