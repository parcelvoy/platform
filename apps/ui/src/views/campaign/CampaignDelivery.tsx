import { useCallback, useContext } from 'react'
import api from '../../api'
import { CampaignContext, ProjectContext } from '../../contexts'
import { CampaignDelivery as Delivery, CampaignSendState } from '../../types'
import Alert from '../../ui/Alert'
import Heading from '../../ui/Heading'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import Tag, { TagVariant } from '../../ui/Tag'
import Tile, { TileGrid } from '../../ui/Tile'
import { formatDate, snakeToTitle } from '../../utils'
import { useRoute } from '../router'

export const CampaignSendTag = ({ state }: { state: CampaignSendState }) => {
    const variant: Record<CampaignSendState, TagVariant> = {
        pending: 'info',
        sent: 'success',
        failed: 'error',
    }

    return <Tag variant={variant[state]}>
        {snakeToTitle(state)}
    </Tag>
}

export const CampaignStats = ({ delivery }: { delivery: Delivery }) => {

    const percent = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 2 })

    const sent = delivery.sent.toLocaleString()
    const deliveryRate = percent.format(delivery.sent / delivery.total)
    const openRate = percent.format(delivery.opens / delivery.total)
    const clickRate = percent.format(delivery.clicks / delivery.total)

    return (
        <TileGrid numColumns={4}>
            <Tile title={sent} size="large">Total sent</Tile>
            <Tile title={deliveryRate} size="large">Delivery Rate</Tile>
            <Tile title={openRate} size="large">Open Rate</Tile>
            <Tile title={clickRate} size="large">Click Rate</Tile>
        </TileGrid>
    )
}

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
                    {delivery && <CampaignStats delivery={delivery} />}
                    <Heading title="Users" size="h4" />
                    <SearchTable
                        {...searchState}
                        columns={[
                            { key: 'full_name', title: 'Name' },
                            { key: 'email' },
                            { key: 'phone' },
                            {
                                key: 'state',
                                cell: ({ item: { state } }) => CampaignSendTag({ state }),
                            },
                            { key: 'send_at' },
                            { key: 'opened_at' },
                            { key: 'clicks' },
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
