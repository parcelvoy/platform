import crypto from 'crypto'

export const pluralize = (noun: string, count = 2, suffix = 's') => `${noun}${count !== 1 ? suffix : ''}`

export const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]

export const randomInt = (min = 0, max = 100): number => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const pascalToSnakeCase = (str: string): string => str.split(/(?=[A-Z])/).join('_').toLowerCase()

export const uuid = (): string => {
    return crypto.randomUUID()
}

export const encrypt = (str: string): string => {
    const iv = crypto.randomBytes(16).toString('hex').slice(0, 16)
    const encrypter = crypto.createCipheriv('aes-256-cbc', process.env.APP_SECRET!, iv)
    const value = encrypter.update(str, 'utf8', 'hex')
    encrypter.final('hex')
    return iv + value
}

export const decrypt = (str: string): string => {
    const iv = str.slice(0, 16)
    const decrypter = crypto.createDecipheriv('aes-256-cbc', process.env.APP_SECRET!, iv)
    const value = decrypter.update(str.slice(16), 'hex', 'utf8')
    decrypter.final('hex')
    return value
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
