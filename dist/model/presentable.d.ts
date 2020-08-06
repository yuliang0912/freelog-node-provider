import { MongooseModelBase, IMongooseModelBase } from './mongoose-model-base';
export declare class PresentableModel extends MongooseModelBase implements IMongooseModelBase {
    buildMongooseModel(): any;
    static get toObjectOptions(): {
        getters: boolean;
        virtuals: boolean;
        transform(doc: any, ret: any): Pick<any, string | number | symbol>;
    };
}
