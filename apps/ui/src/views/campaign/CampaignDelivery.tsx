import { useCallback, useContext } from 'react'
import api from '../../api'
import { CampaignContext, ProjectContext } from '../../contexts'
import Alert from '../../ui/Alert'
import Heading from '../../ui/Heading'
import { InfoTable } from '../../ui/InfoTable'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import Tag from '../../ui/Tag'
import { formatDate } from '../../utils'
import { useRoute } from '../router'

export default function CampaignDelivery() {
    const [project] = useContext(ProjectContext)
    const [preferences] = useContext(PreferencesContext)
    const [{ id, state, send_at, delivery }] = useContext(CampaignContext)
    const searchState = useSearchTableState(useCallback(async params => await api.campaigns.users(project.id, id, params), [id, project]))
    const route = useRoute()

    return (
        <>
            <Heading title="Delivery" size="h3" />
            {state !== 'draft'
                ? <>
                    {state === 'scheduled'
                        && <Alert title="Scheduled">This campaign is pending delivery. It will begin to roll out at <strong>{formatDate(preferences, send_at)}</strong></Alert>
                    }
                    <InfoTable rows={{
                        Sent: delivery?.sent,
                        Total: delivery?.total,
                    }} direction="horizontal" />

                    <Heading title="Users" size="h4" />
                    <SearchTable
                        {...searchState}
                        columns={[
                            { key: 'full_name', title: 'Name' },
                            { key: 'email' },
                            { key: 'phone' },
                            {
                                key: 'state',
                                cell: ({ item: { state } }) => <Tag>{state}</Tag>,
                            },
                            { key: 'send_at' },
                        ]}
                        onSelectRow={({ id }) => route(`users/${id}`)}
                    />
                </>
                : <Alert variant="plain" title="Pending">
                    This campaign has not been sent yet! Once the campaign is live or scheduled this tab will show the progress and results.
                </Alert>
            }
        </>
    )
}
