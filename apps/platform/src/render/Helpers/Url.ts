import { checkString } from './String'

/**
 * Encodes a Uniform Resource Identifier (URI) component
 * by replacing each instance of certain characters by
 * one, two, three, or four escape sequences representing
 * the UTF-8 encoding of the character.
 */
export const encodeURI = function(str: string): string {
    checkString(str)
    return encodeURIComponent(str)
}

/**
 * Escape the given string by replacing characters with escape sequences.
 * Useful for allowing the string to be used in a URL, etc.
 */
export const escape = function(str: string): URLSearchParams {
    checkString(str)
    return new URLSearchParams(str)
}

/**
 * Decode a Uniform Resource Identifier (URI) component.
 */
export const decodeURI = function(str: string): string {
    checkString(str)
    return decodeURIComponent(str)
}
