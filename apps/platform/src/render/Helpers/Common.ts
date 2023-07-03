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

type HandlebarsOperator = '==' | '===' | '!=' | '!==' | '<' | '>' | '<=' | '>='
export function compare(a: any, operator: HandlebarsOperator, b: any) {

    if (arguments.length < 4) {
        throw new Error('handlebars Helper {{compare}} expects 4 arguments')
    }

    switch (operator) {
    case '==':
        // eslint-disable-next-line eqeqeq
        return a == b
    case '===':
        return a === b
    case '!=':
        // eslint-disable-next-line eqeqeq
        return a != b
    case '!==':
        return a !== b
    case '<':
        return a < b
    case '>':
        return a > b
    case '<=':
        return a <= b
    case '>=':
        return a >= b
    default:
        throw new Error('helper {{compare}}: invalid operator: `' + operator + '`')
    }
}

export function eq(v1: any, v2: any) {
    return v1 === v2
}

export function ne(v1: any, v2: any) {
    return v1 !== v2
}

export function lt(v1: any, v2: any) {
    return v1 < v2
}

export function gt(v1: any, v2: any) {
    return v1 > v2
}

export function lte(v1: any, v2: any) {
    return v1 <= v2
}

export function gte(v1: any, v2: any) {
    return v1 >= v2
}

export function and(...parameters: any[]) {
    return Array.prototype.every.call(parameters, Boolean)
}

export function or(...parameters: any[]) {
    return Array.prototype.slice.call(parameters, 0, -1).some(Boolean)
}
