import { useCallback } from 'react'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'

export default function Admins() {
    const state = useSearchTableQueryState(useCallback(async params => await api.admins.search(params), []))
    return (
        <>
            <PageContent title="Admins">
                <SearchTable
                    {...state}
                    columns={[
                        { key: 'first_name' },
                        { key: 'last_name' },
                        { key: 'email' },
                    ]} />
            </PageContent>
        </>
    )
}
