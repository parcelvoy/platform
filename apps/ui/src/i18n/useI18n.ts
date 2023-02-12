import { useContext, useMemo } from 'react'
import { PreferencesContext } from '../ui/PreferencesContext'
import { StringKey, strings } from './strings'
import * as languages from './languages'
import { format } from 'date-fns-tz'
import { parseISO } from 'date-fns'

export function useI18n() {
    const [{ lang, timeZone }] = useContext(PreferencesContext)
    return useMemo(() => ({

        string: (key: StringKey) => languages[lang as keyof typeof languages]?.[key] ?? strings[key],

        date: (date: Date | string | number, fmt: string) => format(typeof date === 'string' ? parseISO(date) : date, fmt, { timeZone }),

    }), [lang, timeZone])
}
