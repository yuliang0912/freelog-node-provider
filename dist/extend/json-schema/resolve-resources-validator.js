"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveResourcesValidator = void 0;
const midway_1 = require("midway");
const freelogCommonJsonSchema = require("egg-freelog-base/app/extend/json-schema/common-json-schema");
let resolveResourcesValidator = class resolveResourcesValidator extends freelogCommonJsonSchema {
    validate(resolveResources) {
        return super.validate(resolveResources, super.getSchema('/resolveResourcesSchema'));
    }
    registerValidators() {
        super.addSchema({
            id: "/resolveResourcesSchema",
            type: "array",
            uniqueItems: true,
            items: {
                type: "object",
                required: true,
                additionalProperties: false,
                properties: {
                    resourceId: { type: "string", required: true, format: 'mongoObjectId' },
                    contracts: {
                        type: "array",
                        uniqueItems: true,
                        required: true,
                        maxItems: 10,
                        minItems: 1,
                        items: {
                            type: "object",
                            required: true,
                            additionalProperties: false,
                            properties: {
                                policyId: { type: "string", required: true, format: 'md5' }
                            }
                        }
                    }
                }
            }
        });
    }
};
__decorate([
    midway_1.init(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], resolveResourcesValidator.prototype, "registerValidators", null);
resolveResourcesValidator = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide()
], resolveResourcesValidator);
exports.resolveResourcesValidator = resolveResourcesValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZS1yZXNvdXJjZXMtdmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9qc29uLXNjaGVtYS9yZXNvbHZlLXJlc291cmNlcy12YWxpZGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQTRDO0FBRzVDLHNHQUFzRztBQUl0RyxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUEwQixTQUFRLHVCQUF1QjtJQUVsRSxRQUFRLENBQUMsZ0JBQTBCO1FBQy9CLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBR0Qsa0JBQWtCO1FBQ2QsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNaLEVBQUUsRUFBRSx5QkFBeUI7WUFDN0IsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsSUFBSTtZQUNqQixLQUFLLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsUUFBUSxFQUFFLElBQUk7Z0JBQ2Qsb0JBQW9CLEVBQUUsS0FBSztnQkFDM0IsVUFBVSxFQUFFO29CQUNSLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFDO29CQUNyRSxTQUFTLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLE9BQU87d0JBQ2IsV0FBVyxFQUFFLElBQUk7d0JBQ2pCLFFBQVEsRUFBRSxJQUFJO3dCQUNkLFFBQVEsRUFBRSxFQUFFO3dCQUNaLFFBQVEsRUFBRSxDQUFDO3dCQUNYLEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxRQUFRLEVBQUUsSUFBSTs0QkFDZCxvQkFBb0IsRUFBRSxLQUFLOzRCQUMzQixVQUFVLEVBQUU7Z0NBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUM7NkJBQzVEO3lCQUNKO3FCQUNKO2lCQUNKO2FBQ0o7U0FDSixDQUFDLENBQUE7SUFDTixDQUFDO0NBQ0osQ0FBQTtBQTlCRztJQURDLGFBQUksRUFBRTs7OzttRUE4Qk47QUFwQ1EseUJBQXlCO0lBRnJDLGNBQUssQ0FBQyxXQUFXLENBQUM7SUFDbEIsZ0JBQU8sRUFBRTtHQUNHLHlCQUF5QixDQXFDckM7QUFyQ1ksOERBQXlCIn0=