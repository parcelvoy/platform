import { parseISO, formatDuration as dateFnsFormatDuration } from 'date-fns'
import { format } from 'date-fns-tz'
import { Preferences } from './types'
import { v4 } from 'uuid'

export function createUuid() {
    return v4()
}

export function toInt(str: string | undefined, defaultValue: number) {
    const p = parseInt(str ?? '', 10)
    return isNaN(p) ? defaultValue : p
}

export function round(n: number, places?: number) {
    if (places && places > 0) {
        const f = Math.pow(10, places)
        return Math.round(n * f) / f
    }
    return Math.round(n)
}

export function snakeToTitle(snake: string) {
    return (snake ?? '').split('_').map(p => p.charAt(0).toUpperCase() + p.substring(1)).join(' ')
}

export function camelToTitle(camel: string) {
    return camel
        .replace(/([A-Z])/g, (match) => ` ${match}`)
        .replace(/^./, (match) => match.toUpperCase())
        .trim()
}

export function kebabToCamel(kebab: string) {
    return kebab.replace(/-./g, x => x[1].toUpperCase())
}

export function combine(...parts: Array<string | number>) {
    return parts.filter(item => item != null).join(' ')
}

export function localStorageAssign<T extends object>(key: string, o: T) {
    try {
        const stored = localStorage.getItem(key)
        if (stored) {
            Object.assign(o, JSON.parse(stored))
        }
    } catch (err) {
        console.warn(err)
    }
    return o
}

export function localStorageSet<T extends object>(key: string, o: T) {
    localStorage.setItem(key, JSON.stringify(o))
}

export function debounce(fn: Function, ms = 300) {
    let timeoutId: ReturnType<typeof setTimeout>
    return function(this: any, ...args: any[]) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn.apply(this, args), ms)
    }
}

type DateArg = number | string | Date

function parseDate(date: DateArg) {
    if (typeof date === 'number') {
        return new Date(date)
    }
    if (typeof date === 'string') {
        return parseISO(date)
    }
    return date
}

export function formatDate(preferences: Preferences, date: DateArg, fmt: string = 'Pp') {
    return format(parseDate(date), fmt, {
        // TODO: locale
        timeZone: preferences.timeZone,
    })
}

export function formatDuration(_preferences: Preferences, duration: Duration) {
    return dateFnsFormatDuration(duration, {
        delimiter: ', ',
        // TODO locale
    })
}

export function languageName(locale: string) {
    const languages = new Intl.DisplayNames([locale], {
        type: 'language',
    })
    return languages.of(locale)
}

export function createComparator<T>(getter: (o: T) => any, desc = false) {
    return (a: T, b: T) => {
        const av = getter(a)
        const bv = getter(b)
        if (av < bv) {
            return desc ? 1 : -1
        }
        if (av > bv) {
            return desc ? -1 : 1
        }
        return 0
    }
}

export function groupBy<T>(arr: T[], fn: (item: T) => any) {
    return arr.reduce<Record<string, T[]>>((prev, curr) => {
        const groupKey = fn(curr)
        const group = prev[groupKey] || []
        group.push(curr)
        return { ...prev, [groupKey]: group }
    }, {})
}

export function groupByKey<T>(arr: T[], key: keyof T) {
    return groupBy(arr, (item) => item[key])
}
