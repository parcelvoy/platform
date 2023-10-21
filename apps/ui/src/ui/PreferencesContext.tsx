import { useMemo, useState, useEffect, Dispatch, PropsWithChildren, createContext, SetStateAction } from 'react'
import { Preferences } from '../types'
import { localStorageGetJson, localStorageSetJson } from '../utils'

const PREFERENCES = 'preferences'

const initial: Preferences = {
    mode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    ...localStorageGetJson<Preferences>(PREFERENCES) ?? {},
    lang: window.navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

export const PreferencesContext = createContext<readonly [Preferences, Dispatch<SetStateAction<Preferences>>]>([
    initial,
    () => {},
])

export function PreferencesProvider({ children }: PropsWithChildren<{}>) {
    const [preferences, setPreferences] = useState(initial)

    useEffect(() => {
        const handler = () => {
            setPreferences(prev => {
                if (prev.lang !== window.navigator.language) {
                    return { ...prev, lang: window.navigator.language }
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
    }, [preferences])

    return (
        <PreferencesContext.Provider value={useMemo(() => [preferences, setPreferences] as const, [preferences])}>
            {children}
        </PreferencesContext.Provider>
    )
}
