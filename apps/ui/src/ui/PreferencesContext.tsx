import { useMemo, useState, useEffect, Dispatch, PropsWithChildren, createContext, SetStateAction } from 'react'
import { Preferences } from '../types'
import { localStorageAssign, localStorageSet } from '../utils'

const PREFERENCES = 'preferences'

const initial = localStorageAssign<Preferences>(PREFERENCES, {
    lang: window.navigator.language,
    mode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

console.log('initial settings', initial)

export const PreferencesContext = createContext<readonly [Preferences, Dispatch<SetStateAction<Preferences>>]>([
    initial,
    () => {},
])

export function PreferencesProvider({ children }: PropsWithChildren<{}>) {
    const [preferences, setPreferences] = useState(initial)

    useEffect(() => {
        const handler = () => {
            console.log('language changed!', window.navigator.language)
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
        localStorageSet(PREFERENCES, preferences)
    }, [preferences])

    return (
        <PreferencesContext.Provider value={useMemo(() => [preferences, setPreferences] as const, [preferences])}>
            {children}
        </PreferencesContext.Provider>
    )
}
