import { Context, Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router-dom'

interface LoaderContextProviderProps<T> {
    children: ReactNode | ((value: T) => ReactNode)
    context: Context<T>
}

export function LoaderContextProvider<T>({ children, context }: LoaderContextProviderProps<T>) {
    const value = useLoaderData() as T
    return (
        <context.Provider value={value}>
            {
                typeof children === 'function' ? children(value) : children
            }
        </context.Provider>
    )
}

export function StatefulLoaderContextProvider<T>({ children, context }: LoaderContextProviderProps<[T, Dispatch<SetStateAction<T>>]>) {
    const loader = useLoaderData() as T
    const [state, setState] = useState(loader)
    useEffect(() => {
        setState(loader)
    }, [loader])
    const value = useMemo<[T, Dispatch<SetStateAction<T>>]>(() => [state, setState], [state, loader])
    return (
        <context.Provider value={value}>
            {
                typeof children === 'function' ? children(value) : children
            }
        </context.Provider>
    )
}
