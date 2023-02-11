import { add, sub } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const baseDate = (date: Date | string): Date => {
    if (date === 'now') { return new Date() }
    if (typeof date === 'string') {
        return new Date(date)
    }
    return date
}

export const now = function(format = 'yyyy-MM-dd HH:mm:ss', timezone = 'UTC'): string {
    return dateFormat('now', format, timezone)
}

/**
 * Format a date instance into the provided format.
 */
export const dateFormat = function(date: Date | string, format: string, timezone = 'UTC'): string {
    return formatInTimeZone(baseDate(date), timezone, format)
}

type DateUnit = 'years' | 'months'| 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'
const isUnit = (value: DateUnit): boolean => ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'].includes(value)

/**
 * Perform date math on a given date by adding some unit to the date.
 *
 * i.e. {{addDate "1974-01-23" 1 "months" }}
 */
export const addDate = function(date: Date | string, amount: number, unit: DateUnit): Date {
    if (!isUnit(unit)) return baseDate(date)

    return add(baseDate(date), { [unit]: amount })
}

/**
 * Perform date math on a given date by subtracting some unit to the date.
 *
 * i.e. {{subDate "1974-01-23" 1 "months" }}
 */
export const subtractDate = function(date: Date | string, amount: number, unit: DateUnit): Date {
    if (!isUnit(unit)) return baseDate(date)

    return sub(baseDate(date), { [unit]: amount })
}
export const subDate = subtractDate
