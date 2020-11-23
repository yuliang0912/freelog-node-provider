import {inject, provide} from 'midway';
import {IPresentableService} from '../interface';
import {ApplicationError, CryptoHelper, FreelogContext} from 'egg-freelog-base';

@provide()
export class PresentableCommonChecker {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableService: IPresentableService;

    async checkResourceIsCreated(nodeId: number, resourceId: string): Promise<void> {

        const existingPresentable = await this.presentableService.findOne({
            nodeId, 'resourceInfo.resourceId': resourceId
        }, '_id');

        if (existingPresentable) {
            throw new ApplicationError(this.ctx.gettext('presentable-release-repetition-create-error'))
        }
    }

    async checkPresentableNameIsUnique(nodeId: number, presentableName: string) {
        const presentable = await this.presentableService.findOne({
            nodeId, presentableName: new RegExp(`^${presentableName.trim()}`, 'i')
        }, '_id');
        if (presentable) {
            throw new ApplicationError(this.ctx.gettext('presentable-name-has-already-existed', presentableName))
        }
    }

    /**
     * 系统自动生成presentableName,如果不存在名称,则直接默认使用资源名称,否则会在后面递增追加序号
     * @param nodeId
     * @param presentableName
     */
    async buildPresentableName(nodeId: number, presentableName: string): Promise<string> {
        const presentableNames = await this.presentableService.find({
            nodeId, presentableName: new RegExp(`^${presentableName.trim()}`, 'i')
        }, 'presentableName');

        if (!presentableNames.length || !presentableNames.some(x => x.presentableName.toUpperCase() === presentableName.toUpperCase())) {
            return presentableName;
        }

        for (let i = 0; i < presentableNames.length; i++) {
            let newPresentableName = `${presentableName}(${i + 1})`;
            if (presentableNames.some(x => x.presentableName.toUpperCase() === newPresentableName.toUpperCase())) {
                continue;
            }
            return newPresentableName;
        }
    }

    /**
     * 生成资源版本ID
     * @param presentableId
     * @param version
     */
    generatePresentableVersionId(presentableId: string, version: string): string {
        return CryptoHelper.md5(`${presentableId}-${version}`);
    }
}
