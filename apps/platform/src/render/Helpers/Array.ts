import { isNumber } from './Number'
import { isString } from './String'
import { checkType, isType } from './Util'

/**
 * Cast the given `value` to an array.
 */
export const wrap = function(value: any): any[] {
    return value ? (Array.isArray(value) ? value : [value]) : []
}

/**
 * Returns the first item of an array.
 */
export const first = function(array: any[]): any {
    checkType(array, 'array')
    return array[0]
}

/**
 * Returns the first `n` items of an array.
 */
export const firstN = function(array: any[], n?: number): any[] {
    checkType(array, 'array')
    if (!isNumber(n)) {
        return array[0]
    }
    return array.slice(0, n)
}

/**
 * Returns true if `value` is an array.
 */
export const isArray = function(value: any): boolean {
    return Array.isArray(value)
}

/**
 * Returns the item from `array` at index `idx`.
 */
export const itemAt = function(array: any[], idx?: number): any {
    checkType(array, 'array')
    idx = isNumber(idx) ? idx ?? 0 : 0
    if (idx < 0) {
        return array[array.length + idx]
    }
    if (idx < array.length) {
        return array[idx]
    }
    return array[0]
}

/**
 * Join all elements of array into a string, optionally using a
 * given separator.
 */
export const join = function(array: any, separator?: string): string {
    if (isString(array)) return array
    if (checkType(array, 'array')) {
        separator = isString(separator) ? separator : ', '
    }
    return array.join(separator)
}

/**
 * Returns the last item of an array.
 * Opposite of `first`.
 */
export const last = function(value: any[]): any {
    checkType(value, 'array')
    return value[value.length - 1]
}

/**
 * Returns the last `n` items of an array or string. Opposite of `firstN`.
 */
export const lastN = function(value: any[], n?: number): any[] {
    checkType(value, 'array')
    if (!isNumber(n)) {
        return value[value.length - 1]
    }
    return value.slice(-Math.abs(n ?? 1))
}

/**
 * Returns the length of the given string or array.
 */
export const length = function(value: any): number {
    if (isType(value, 'object')) {
        value = Object.keys(value)
    }
    if (isType(value, 'string') || isType(value, 'array')) {
        return value.length
    }
    return 0
}

/**
 * Map over the given array of objects and create an array containing
 * only the single needed value in the object
 */
export const pluck = function(array: any[], prop: string): any[] {
    checkType(array, 'array')

    return array.map(item => {
        if (prop in item) {
            return item[prop]
        }
        return null
    })
}

/**
 * Reverse the elements in an array, or the characters in a string.
 */
export const reverse = function(value: any[] | string): any[] | string {
    if (Array.isArray(value)) {
        return value.reverse()
    }
    if (typeof value === 'string') {
        return value.split('').reverse().join('')
    }
    throw new TypeError('Expected value to be an array or string.')
}

/**
 * Sort the given `array`. A second direction value may be passed to
 * determine if the array should be in ascending or descending order.
 */
export const sort = function(array: any[], direction?: 'asc' | 'desc'): any[] {
    checkType(array, 'array')
    if (isString(direction) && direction === 'desc') {
        return array.sort().reverse()
    }
    return array.sort()
}
