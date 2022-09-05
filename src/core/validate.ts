import Ajv, { JSONSchemaType } from 'ajv'
import { RequestError } from './errors'

const validator = new Ajv()

export { JSONSchemaType }

export const validate = <T>(schema: JSONSchemaType<T>, data: any): T => {
    const validate = validator.getSchema<T>(schema.$id!)
        || validator.compile(schema)
    if (validate(data)) {
        return data
    }
    throw new RequestError(JSON.stringify(validate.errors), 422)
}
