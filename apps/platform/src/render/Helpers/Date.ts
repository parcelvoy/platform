import { add, differenceInMonths, differenceInYears, differenceInDays, differenceInHours, differenceInMinutes, sub, nextDay, Day, differenceInSeconds, set, formatISO } from 'date-fns'
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
 * Set a given component of a date to a provided value.
 *
 * i.e. {{setDate "1974-01-23" "months" 1 }}
 */
export const setDate = function(date: Date | string, unit: DateUnit, value: number): string {
    return formatISO(
        isUnit(unit)
            ? set(baseDate(date), { [unit]: value })
            : baseDate(date),
    )
}

/**
 * Perform date math on a given date by adding some unit to the date.
 *
 * i.e. {{addDate "1974-01-23" 1 "months" }}
 */
export const addDate = function(date: Date | string, amount: number, unit: DateUnit): string {
    return formatISO(
        isUnit(unit)
            ? add(baseDate(date), { [unit]: amount })
            : baseDate(date),
    )
}

/**
 * Perform date math on a given date by subtracting some unit to the date.
 *
 * i.e. {{subDate "1974-01-23" 1 "months" }}
 */
export const subtractDate = function(date: Date | string, amount: number, unit: DateUnit): string {
    return formatISO(
        isUnit(unit)
            ? sub(baseDate(date), { [unit]: amount })
            : baseDate(date),
    )
}
export const subDate = subtractDate

/**
 * Get the next day of week based on criteria.
 *
 * i.e. {{nextDate "1974-01-23" "fr" }}
 */
export const nextDate = function(date: Date | string, day: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su'): string {
    const dates: Record<string, Day> = { mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6 }
    const base = baseDate(date)
    return formatISO(nextDay(base, dates[day]))
}

/**
 * Get the distance between two days in the provided unit
 *
 * i.e. {{nextDate "1974-01-23" "fr" }}
 */
export const dateDiff = function(date: Date | string, date2: Date | string, unit: DateUnit = 'days'): number {
    if (!isUnit(unit)) return 0
    switch (unit) {
    case 'years': return differenceInYears(baseDate(date), baseDate(date2))
    case 'months': return differenceInMonths(baseDate(date), baseDate(date2))
    case 'days': return differenceInDays(baseDate(date), baseDate(date2))
    case 'hours': return differenceInHours(baseDate(date), baseDate(date2))
    case 'minutes': return differenceInMinutes(baseDate(date), baseDate(date2))
    case 'seconds': return differenceInSeconds(baseDate(date), baseDate(date2))
    }
    return 0
}
