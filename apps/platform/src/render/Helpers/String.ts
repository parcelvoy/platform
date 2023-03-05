import { snakeCase } from '../../utilities'
import { isNumber } from './Number'
import { checkType, isType } from './Util'

/**
 * Return true if `value` is a string.
 */
export const isString = function(value: any): boolean {
    return isType(value, 'string')
}

export const checkString = (value: any, message?: string): boolean => {
    return checkType(value, 'string', message)
}

/**
 * Appends the speficied `suffix to the given `string`.
 */
export const append = function(str: string, suffix: string) {
    if (isString(str) && isString(suffix)) {
        return str + suffix
    }
    return str
}

/**
 * camelCase the characters in the given `string`.
 */
export const camelcase = function(str: string): string {
    if (!isString(str)) return ''
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase()
    }).replace(/\s+/g, '')
}

/**
 * Capitalize the first word in a sentence.
 */
export const capitalize = function(str: string): string {
    if (!isString(str)) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Capitalize all words in a string.
 */
export const capitalizeAll = function(str: string): string {
    if (!isString(str)) return ''
    return str.replace(/\w\S*/g, function(word) {
        return capitalize(word)
    })
}

/**
 * Truncates a string to the specified `length`, and appends
 * it with an ellipsis, `…`.
 */
export const ellipsis = function(str: string, limit: number): string {
    if (!isString(str)) return ''
    if (str.length <= limit) {
        return str
    }
    return truncate(str, limit) + '…'
}

/**
 * Lowercase all characters in the given string.
 */
export const lowercase = function(str: string): string {
    if (!isString(str)) return ''
    return str.toLowerCase()
}

/**
 * Return the number of occurrences of `substring` within the
 * given `string`.
 */
export const occurrences = function(str: string, substring: string): number {
    if (!isString(str) || !isString(str)) return 0
    const len = substring.length
    let pos = 0
    let n = 0

    while ((pos = str.indexOf(substring, pos)) > -1) {
        n++
        pos += len
    }
    return n
}

/**
 * Prepends the given `string` with the specified `prefix`.
 */
export const prepend = function(str: string, prefix: string): string {
    return isString(str) && isString(prefix)
        ? (prefix + str)
        : str
}

/**
 * Replace all occurrences of substring `a` with substring `b`.
 */
export const replace = function(str: string, a: string, b: string): string {
    if (!isString(str)) return ''
    if (!isString(a)) return str
    if (!isString(b)) b = ''
    return str.split(a).join(b)
}

/**
 * Replace the first occurrence of substring `a` with substring `b`.
 */
export const replaceFirst = function(str: string, a: string, b: string): string {
    if (!isString(str)) return ''
    if (!isString(a)) return str
    if (!isString(b)) b = ''
    return str.replace(a, b)
}

/**
 * Reverse a string.
 */
export const reverse = function(str: string): string {
    if (!isString(str)) return ''
    return str.split('').reverse().join('')
}

/**
 * snake_case the characters in the given `string`.
 */
export const snakecase = function(str: string): string {
    if (!isString(str)) return ''
    return snakeCase(str)
}

/**
 * Split `string` by the given `character`.
 */
export const split = function(str: string, character: string): string[] {
    if (!isString(str)) return [str]
    if (!isString(character)) character = ','
    return str.split(character)
}

/**
 * Tests whether a string begins with the given prefix.
 */
export const startsWith = function(prefix: string, str: string): boolean {
    return isString(str) && str.startsWith(prefix)
}

/**
 * Title case the given string.
 */
export const titleize = function(str: string): string {
    if (!isString(str)) return ''
    const title = str.replace(/[- _]+/g, ' ')
    const words = title.split(' ')
    const res = []
    let len = words.length
    let i = 0
    while (len--) {
        const word = words[i++]
        res.push(capitalize(word))
    }
    return res.join(' ')
}

/**
 * Removes extraneous whitespace from the beginning and end
 * of a string.
 */
export const trim = function(str: string) {
    return isString(str) ? str.trim() : ''
}

/**
 * Truncate a string to the specified `length`
 */
export const truncate = function(str: string, limit: number, suffix = ''): string {
    if (!isString(str)) return ''
    if (!isString(suffix)) suffix = ''
    if (str.length > limit) {
        return str.slice(0, limit - suffix.length) + suffix
    }
    return str
}

/**
 * Truncate a string to have the specified number of words.
 */
export const truncateWords = function(str: string, count: number, suffix = ''): string {
    if (!isString(str) || !isNumber(count)) return ''
    if (!isString(suffix)) {
        suffix = '…'
    }

    const num = Number(count)
    let arr = str.split(/[ \t]/)
    if (num > arr.length) {
        arr = arr.slice(0, num)
    }

    return arr.join(' ').trim() + suffix
}
