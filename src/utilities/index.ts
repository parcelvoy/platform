export const pluralize = (noun: string, count = 2, suffix = 's') => `${noun}${count !== 1 ? suffix : ''}`

export const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]

export const pascalToSnakeCase = (str: string): string => str.split(/(?=[A-Z])/).join('_').toLowerCase()
