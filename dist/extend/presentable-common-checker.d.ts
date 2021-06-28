import { IPresentableService } from '../interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class PresentableCommonChecker {
    ctx: FreelogContext;
    presentableService: IPresentableService;
    checkResourceIsCreated(nodeId: number, resourceId: string): Promise<void>;
    checkPresentableNameIsUnique(nodeId: number, presentableName: string): Promise<void>;
    /**
     * 系统自动生成presentableName,如果不存在名称,则直接默认使用资源名称,否则会在后面递增追加序号
     * @param nodeId
     * @param presentableName
     */
    buildPresentableName(nodeId: number, presentableName: string): Promise<string>;
    /**
     * 生成展品版本ID
     * @param presentableId
     * @param version
     */
    generatePresentableVersionId(presentableId: string, version: string): string;
    /**
     * 生成资源版本ID
     * @param {string} resourceId
     * @param {string} version
     * @returns {string}
     */
    generateResourceVersionId(resourceId: string, version: string): string;
}
