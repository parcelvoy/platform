import { isString } from './String'
import { checkType, isType } from './Util'

/**
 * Return true if `value` is a number.
 */
export const isNumber = function(value: any): boolean {
    return isType(value, 'number')
}

const checkNumber = (value: any, message?: string): boolean => {
    return checkType(value, 'number', message ?? 'Expected a number.')
}

/**
 * For a given set of Handlebars arguments, get the number values.
 */
const getNumbers = (...args: any[]): number[] => {
    // Loop over each value and check its type
    const numbers: number[] = []
    for (const arg of args) {
        // Skip the Handlebars helper object
        if (Object.hasOwn(arg, 'loc')) continue

        // Check that each value is a number and append
        checkNumber(arg, 'Expected all arguments to be numbers.')
        numbers.push(Number(arg))
    }
    return numbers
}

/**
 * Run a given operation across all values in an array.
 */
const operate = (values: any[], operation: (a: number, b: number) => number) => {
    return getNumbers(...values)
        .reduce(operation)
}

/**
 * Return the absolute value of `a`.
 */
export const abs = function(value: number | any): number {
    const [num] = getNumbers(value)
    return Math.abs(num)
}

/**
 * Return the sum of `a` plus `b`
 */
export const add = function(...args: any[]): number {
    return operate(args, (a, b) => a + b)
}
export const plus = add

/**
 * Get the `Math.ceil()` of the given value.
 */
export const ceil = function(value: number | any): number {
    const [num] = getNumbers(value)
    return Math.ceil(num)
}

/**
 * Divide `a` by `b`
 */
export const divide = function(...args: any[]): number {
    return operate(args, (a, b) => a / b)
}

/**
 * Get the `Math.floor()` of the given value.
 */
export const floor = function(value: number): number {
    const [num] = getNumbers(value)
    return Math.floor(num)
}

/**
 * Return the difference of `a` minus `b`.
 */
export const subtract = function(...args: any[]): number {
    return operate(args, (a, b) => a - b)
}
export const minus = subtract

/**
 * Return the product of `a` times `b`.
 */
export const multiply = function(...args: any[]): number {
    return operate(args, (a, b) => a * b)
}
export const times = multiply

/**
 * Generate a random number between two values
 */
export const random = function(min: number, max: number) {
    [min, max] = getNumbers(min, max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Get the remainder when `a` is divided by `b`.
 */
export const remainder = function(a: number, b: number): number {
    return operate([a, b], (a, b) => a % b)
}

/**
 * Round the given number.
 */
export const round = function(value: number): number {
    const [num] = getNumbers(value)
    return Math.round(num)
}

/**
 * Format a string given provided criteria
 * @param value The number to be formatted
 * @param locale The locale to format the number into (i.e. en-US)
 * @param style If formatting for currency or percent, pass either style
 * @param currency If formatting for currency, pass the desired currency
 * @returns A string format of the number matching the specifications
 */
export const numberFormat = function(
    value: number,
    locale?: string,
    style?: 'currency' | 'percent' | undefined,
    currency?: string,
): string {
    const [num] = getNumbers(value)
    if (!locale || !isString(locale)) {
        locale = 'en-US'
    }

    const options: Intl.NumberFormatOptions = {}
    if (style && isString(style)) {
        if (style === 'currency' && currency && isString(currency)) {
            options.style = style
            options.currency = currency
        }
        if (style === 'percent') {
            options.style = style
        }
    }

    const formatter = new Intl.NumberFormat(locale, options)
    return formatter.format(num)
}
