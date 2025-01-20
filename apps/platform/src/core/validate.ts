import Ajv, { ErrorObject, JSONSchemaType } from 'ajv'
import addFormats from 'ajv-formats'
import addErrors from 'ajv-errors'
import { capitalizeFirstLetter, isValidIANATimezone } from '../utilities'
import { RequestError } from './errors'

type IsValidSchema = [boolean, Error | undefined]

const validator = new Ajv({ allErrors: true })
addFormats(validator)
addErrors(validator)
validator.addFormat('timezone', {
    type: 'string',
    validate: (timezone: string) => {
        return isValidIANATimezone(timezone)
    },
})

export { JSONSchemaType, IsValidSchema, validator }

export function validate<T>(schema: JSONSchemaType<T>, data: any): T {
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
    const error = errors[0]
    if (error.keyword === 'type') {
        const path = error.instancePath.replace('/', ' ').trim()
        return `The value of \`${path}\` must be a ${error.params.type}.`
    }
    return capitalizeFirstLetter(error.message ?? '')
}
