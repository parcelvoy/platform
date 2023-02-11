export const isType = (value: any, type: string): boolean => {
    if (!value) return false
    if (type === 'array') return Array.isArray(value)
    if (type === 'object') return typeof value === 'object' && value !== null
    return typeof value === type
}

export const checkType = (value: any, type: string, message?: string): boolean => {
    if (!isType(value, type)) {
        throw new TypeError(message ?? `Expected a ${type}.`)
    }
    return true
}
