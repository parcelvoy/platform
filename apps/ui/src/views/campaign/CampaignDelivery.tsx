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
import { formatDate } from '../../utils'
import { useRoute } from '../router'
import { Translation, useTranslation } from 'react-i18next'

export const CampaignSendTag = ({ state }: { state: CampaignSendState }) => {
    const variant: Record<CampaignSendState, TagVariant | undefined> = {
        pending: 'info',
        throttled: 'warn',
        bounced: 'error',
        sent: 'success',
        failed: 'error',
    }
    return <Tag variant={variant[state]}>
        <Translation>{ (t) => t(state) }</Translation>
    </Tag>
}

export const CampaignStats = ({ delivery }: { delivery: Delivery }) => {
    const { t } = useTranslation()
    const percent = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 2 })

    const sent = delivery.sent.toLocaleString()
    const total = delivery.total.toLocaleString()
    const deliveryRate = percent.format(delivery.total ? delivery.sent / delivery.total : 0)
    const openRate = percent.format(delivery.total ? delivery.opens / delivery.total : 0)
    const clickRate = percent.format(delivery.total ? delivery.clicks / delivery.total : 0)

    const SentSpan: React.ReactNode = <span>{sent}/<small>{total}</small></span>

    return (
        <TileGrid numColumns={4}>
            <Tile title={SentSpan} size="large">{t('sent')}</Tile>
            <Tile title={deliveryRate} size="large">{t('delivery_rate')}</Tile>
            <Tile title={openRate} size="large">{t('open_rate')}</Tile>
            <Tile title={clickRate} size="large">{t('click_rate')}</Tile>
        </TileGrid>
    )
}

export default function CampaignDelivery() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const [preferences] = useContext(PreferencesContext)
    const [{ id, state, send_at, delivery }] = useContext(CampaignContext)
    const searchState = useSearchTableState(useCallback(async params => await api.campaigns.users(project.id, id, params), [id, project]))
    const route = useRoute()

    return (
        <>
            <Heading title={t('delivery')} size="h3" />
            {state !== 'draft'
                ? <>
                    {state === 'scheduled'
                        && <Alert title={t('scheduled')}>{t('campaign_alert_scheduled')} <strong>{formatDate(preferences, send_at)}</strong></Alert>
                    }
                    {delivery && <CampaignStats delivery={delivery} />}
                    <Heading title={t('users')} size="h4" />
                    <SearchTable
                        {...searchState}
                        columns={[
                            { key: 'full_name', title: t('name') },
                            { key: 'email', title: t('email') },
                            { key: 'phone', title: t('phone') },
                            {
                                key: 'state',
                                title: t('state'),
                                cell: ({ item: { state } }) => CampaignSendTag({ state }),
                                sortable: true,
                            },
                            { key: 'send_at', title: t('send_at'), sortable: true },
                            { key: 'opened_at', title: t('opened_at') },
                            { key: 'clicks', title: t('clicks') },
                        ]}
                        onSelectRow={({ id }) => route(`users/${id}`)}
                    />
                </>
                : <Alert variant="plain" title={t('pending')}>{t('campaign_alert_pending')}</Alert>
            }
        </>
    )
}
