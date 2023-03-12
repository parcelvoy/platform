import Ajv, { ErrorObject, JSONSchemaType } from 'ajv'
import addFormats from 'ajv-formats'
import addErrors from 'ajv-errors'
import { capitalizeFirstLetter } from '../utilities'
import { RequestError } from './errors'

type IsValidSchema = [boolean, Error | undefined]

const validator = new Ajv({ allErrors: true })
addFormats(validator)
addErrors(validator)

export { JSONSchemaType, IsValidSchema, validator }

export const validate = <T>(schema: JSONSchemaType<T>, data: any): T => {
    const validate = validator.getSchema<T>(schema.$id!)
        || validator.compile(schema)
    if (validate(data)) {
        return data
    }
    throw new RequestError(parseError(validate.errors), 422)
}

export const isValid = (schema: any, data: any): IsValidSchema => {
    const validate = validator.compile(schema)
    const isValid = validate(data)
    if (isValid) return [isValid, undefined]

    const error = parseError(validate.errors)
    return [isValid, new RequestError(error, 422)]
}

export const parseError = (errors: ErrorObject[] | null | undefined = []) => {
    if (errors === null || errors.length <= 0) return 'There was an unknown error validating your request.'
    return capitalizeFirstLetter(errors[0].message ?? '')
}
