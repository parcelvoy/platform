import { parseISO, formatDuration as dateFnsFormatDuration } from 'date-fns'
import { format, utcToZonedTime } from 'date-fns-tz'
import { OrganizationRole, Preferences, ProjectRole, organizationRoles, projectRoles } from './types'
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

export const prune = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null && v !== ''),
    )
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

export function combine(...parts: Array<string | number>) {
    return parts.filter(item => item != null).join(' ')
}

export function localStorageGetJson<T extends object>(key: string) {
    try {
        const stored = localStorage.getItem(key)
        if (stored) {
            return JSON.parse(stored) as T
        }
    } catch (err) {
        console.warn(err)
    }
}

export function localStorageSetJson<T extends object>(key: string, o: T) {
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

export function formatDate(preferences: Preferences, date: DateArg, fmt: string = 'Pp', timeZone = preferences.timeZone) {
    const zonedDate = utcToZonedTime(parseDate(date), timeZone)
    return format(zonedDate, fmt)
}

export function formatDuration(_preferences: Preferences, duration: Duration) {
    return dateFnsFormatDuration(duration, {
        delimiter: ', ',
        // TODO locale
    })
}

export function languageName(locale: string) {
    try {
        const languages = new Intl.DisplayNames([locale], {
            type: 'language',
        })
        return languages.of(locale)
    } catch {
        return undefined
    }
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

export function arrayMove<T>(arr: T[], currentIndex: number, targetIndex: number) {
    if (targetIndex >= arr.length) {
        let k = targetIndex - arr.length + 1
        while (k--) {
            (arr as any).push(undefined)
        }
    }
    arr.splice(targetIndex, 0, arr.splice(currentIndex, 1)[0])
    return arr
}

const RECENT_PROJECTS = 'recent-projects'

type RecentProjects = Array<{
    id: number
    when: number
}>

export function getRecentProjects() {
    return (localStorageGetJson<RecentProjects>(RECENT_PROJECTS) ?? [])
}

export function pushRecentProject(id: number | string) {
    const stored = getRecentProjects()
    const idx = stored.findIndex(p => p.id === id)
    if (idx !== -1) {
        arrayMove(stored, idx, 0)
    } else {
        stored.unshift({
            id: typeof id === 'string' ? parseInt(id, 10) : id,
            when: Date.now(),
        })
    }
    while (stored.length > 3) {
        stored.pop()
    }
    localStorageSetJson(RECENT_PROJECTS, stored)
    return stored
}

/**
 * @returns true if user has at least the minRole
 */
export function checkProjectRole(minRole: ProjectRole, currentRole: ProjectRole = 'support') {
    return projectRoles.indexOf(minRole) <= projectRoles.indexOf(currentRole)
}

export function checkOrganizationRole(minRole: OrganizationRole, currentRole: OrganizationRole = 'member') {
    return organizationRoles.indexOf(minRole) <= organizationRoles.indexOf(currentRole)
}
