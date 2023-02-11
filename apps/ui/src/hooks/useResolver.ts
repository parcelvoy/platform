import { useCallback, useEffect, useMemo, useState } from 'react'

export default function useResolver<T>(resolver: () => Promise<T>) {
    const [value, setValue] = useState<null | T>(null)
    const reload = useCallback(async () => await resolver().then(setValue).catch(err => console.error(err)), [resolver])
    useEffect(() => {
        reload().catch(err => console.error(err))
    }, [reload])
    return useMemo(() => [value, setValue, reload] as const, [value, reload])
}
