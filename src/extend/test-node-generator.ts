import {provide} from 'midway';
import {TestResourceOriginInfo} from '../test-node-interface';
import {md5} from 'egg-freelog-base/app/extend/helper/crypto_helper'


@provide()
export class TestNodeGenerator {

    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId: number, originInfo: TestResourceOriginInfo) {
        return md5(`${nodeId}-${originInfo.id}-${originInfo.type}`);
    }

}