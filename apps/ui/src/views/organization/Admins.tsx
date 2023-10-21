import { useCallback, useContext } from 'react'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'
import { Alert } from '../../ui'
import { OrganizationContext } from '../../contexts'

export default function Admins() {
    const state = useSearchTableQueryState(useCallback(async params => await api.admins.search(params), []))
    const [organization] = useContext(OrganizationContext)
    const url = `${window.location.protocol}//${organization.username}.${window.location.hostname}:${window.location.port}`
    return (
        <>
            <PageContent title="Admins">
                <Alert title="Invite Link">To be joined to your organization, send users an invite from a project or have them register using the following link: <br/><strong>{url}</strong></Alert>
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
