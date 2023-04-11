import { HelperOptions } from 'handlebars'

export function ifEquals<T>(
    this: T,
    left: any,
    right: any,
    options: HelperOptions,
) {
    if (arguments.length !== 3) {
        return '' // throw error?
    }
    return left === right ? options.fn(this) : options.inverse(this)
}
