import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useResolver<T>(resolver: () => Promise<T>) {
    const [value, setValue] = useState<null | T>(null)
    const reload = useCallback(async () => await resolver().then(setValue).catch(err => console.error(err)), [resolver])
    useEffect(() => {
        reload().catch(err => console.error(err))
    }, [reload])
    return useMemo(() => [value, setValue, reload] as const, [value, reload])
}

export function useDebounceControl<T>(
    value: T,
    onChange: (value: T) => void,
    ms = 400,
) {
    const changeRef = useRef(onChange)
    changeRef.current = onChange
    const valueRef = useRef(value)
    valueRef.current = value
    const timeoutId = useRef<ReturnType<typeof setTimeout>>()
    const synced = useRef(true)
    const [temp, setTemp] = useState<T>(value)
    useEffect(() => {
        clearTimeout(timeoutId.current)
        if (valueRef.current !== temp) {
            timeoutId.current = setTimeout(() => {
                changeRef.current(temp)
                synced.current = false
            }, ms)
        }
    }, [temp, ms])
    useEffect(() => {
        if (!synced.current) {
            setTemp(value)
            synced.current = true
        }
    }, [value])
    return [temp, setTemp] as const
}
