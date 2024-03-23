import { useMemo, useState, useEffect, Dispatch, PropsWithChildren, createContext, SetStateAction } from 'react'
import { Preferences } from '../types'
import { localStorageGetJson, localStorageSetJson } from '../utils'
import { useTranslation } from 'react-i18next'

const PREFERENCES = 'preferences'

const language = () => {
    return window.navigator.language.split('-')[0]
}

const initial: Preferences = {
    mode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    lang: language(),
    ...localStorageGetJson<Preferences>(PREFERENCES) ?? {},
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

export const PreferencesContext = createContext<readonly [Preferences, Dispatch<SetStateAction<Preferences>>]>([
    initial,
    () => {},
])

export function PreferencesProvider({ children }: PropsWithChildren<{}>) {
    const { i18n } = useTranslation()
    const [preferences, setPreferences] = useState(initial)

    useEffect(() => {
        const handler = () => {
            setPreferences(prev => {
                if (prev.lang !== language()) {
                    return { ...prev, lang: language() }
                }
                return prev
            })
        }
        window.addEventListener('languagechange', handler)
        return () => {
            window.removeEventListener('languagechange', handler)
        }
    }, [])

    useEffect(() => {
        document.body.setAttribute('data-theme', preferences.mode === 'dark' ? 'dark' : 'light')
        localStorageSetJson(PREFERENCES, preferences)
        i18n.changeLanguage(preferences.lang).catch(() => {})
    }, [preferences])

    return (
        <PreferencesContext.Provider value={useMemo(() => [preferences, setPreferences] as const, [preferences])}>
            {children}
        </PreferencesContext.Provider>
    )
}
