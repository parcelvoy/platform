import crypto from 'crypto'
import Hashids from 'hashids'

export const pluralize = (noun: string, count = 2, suffix = 's') => `${noun}${count !== 1 ? suffix : ''}`

export const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]

export const randomInt = (min = 0, max = 100): number => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const snakeCase = (str: string): string => str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map(x => x.toLowerCase())
    .join('_') ?? ''

export const uuid = (): string => {
    return crypto.randomUUID()
}

const hashCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
const hashMinimumLength = 10
export const encodeHashid = function(value: number): string {
    const hashids = new Hashids(
        process.env.APP_SECRET,
        hashMinimumLength,
        hashCharacters,
    )
    return hashids.encode(value)
}

export const decodeHashid = function(value?: string | null): number | undefined {
    if (!value) return
    const hashids = new Hashids(
        process.env.APP_SECRET,
        hashMinimumLength,
        hashCharacters,
    )
    return hashids.decode(value)?.[0] as number | undefined
}

export const combineURLs = (parts: string[], sep = '/'): string => {
    return parts
        .map(part => {
            const part2 = part.endsWith(sep) ? part.substring(0, part.length - 1) : part
            return part2.startsWith(sep) ? part2.substr(1) : part2
        })
        .join(sep)
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
