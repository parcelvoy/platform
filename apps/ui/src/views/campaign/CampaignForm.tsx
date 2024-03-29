import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Campaign, CampaignCreateParams, CampaignType, List, Provider, SearchParams, Subscription } from '../../types'
import { useController, UseFormReturn, useWatch } from 'react-hook-form'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Heading from '../../ui/Heading'
import ListTable from '../users/ListTable'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { snakeToTitle } from '../../utils'
import RadioInput from '../../ui/form/RadioInput'
import { SelectionProps } from '../../ui/form/Field'
import { TagPicker } from '../settings/TagPicker'
import { Column, Columns } from '../../ui/Columns'
import Modal from '../../ui/Modal'
import Button, { LinkButton } from '../../ui/Button'
import { DataTable } from '../../ui/DataTable'
import { Alert } from '../../ui'
import { useTranslation } from 'react-i18next'

interface CampaignEditParams {
    campaign?: Campaign
    onSave: (campaign: Campaign) => void
    type?: CampaignType
}

interface ListSelectionProps extends SelectionProps<CampaignCreateParams> {
    title: string
    value?: List[]
    required: boolean
}

const ListSelection = ({
    control,
    name,
    title,
    value,
    required,
}: ListSelectionProps) => {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const [isOpen, setIsOpen] = useState(false)
    const [lists, setLists] = useState<List[]>(value ?? [])
    const search = useCallback(async (params: SearchParams) => await api.lists.search(project.id, params), [project])

    const handlePickList = (list: List) => {
        if (list.state !== 'ready') {
            if (!confirm(t('campaign_list_generating'))) return
        }

        const newLists = [...lists.filter(item => item.id !== list.id), list]
        setLists(newLists)
        onChange(newLists.map(list => list.id))
        setIsOpen(false)
    }

    const handleRemoveList = (list: List) => {
        const newLists = [...lists].filter(item => item.id !== list.id)
        setLists(newLists)
        onChange(newLists.map(list => list.id))
    }

    const { field: { onChange } } = useController({
        control,
        name,
        rules: {
            required,
        },
    })

    return (
        <>
            <Heading size="h4" title={
                <>
                    {title}
                    {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                </>
            } actions={
                <Button
                    size="small"
                    onClick={() => setIsOpen(true)}>{t('add_list')}</Button>
            } />
            <DataTable
                items={lists}
                itemKey={({ item }) => item.id}
                columns={[
                    { key: 'name', title: t('title') },
                    {
                        key: 'type',
                        title: t('type'),
                        cell: ({ item: { type } }) => snakeToTitle(type),
                    },
                    {
                        key: 'users_count',
                        title: t('users_count'),
                        cell: ({ item }) => item.users_count?.toLocaleString(),
                    },
                    { key: 'updated_at', title: t('updated_at') },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={() => handleRemoveList(item)}>
                                {t('remove')}
                            </Button>
                        ),
                    },
                ]}
                emptyMessage={t('campaign_form_select_list')}
            />
            <Modal
                open={isOpen}
                onClose={setIsOpen}
                title={title}
                size="large">
                <ListTable
                    search={search}
                    onSelectRow={handlePickList}
                />
            </Modal>
        </>
    )
}

const ChannelSelection = ({ subscriptions, form }: {
    subscriptions: Subscription[]
    form: UseFormReturn<CampaignCreateParams>
}) => {
    const { t } = useTranslation()
    const channels = [...new Set(subscriptions.map(item => item.channel))].map(item => ({
        key: item,
        label: snakeToTitle(item),
    }))
    return (
        <RadioInput.Field
            form={form}
            name="channel"
            label={t('medium')}
            options={channels}
            required
        />
    )
}

const SubscriptionSelection = ({ subscriptions, form }: { subscriptions: Subscription[], form: UseFormReturn<CampaignCreateParams> }) => {
    const { t } = useTranslation()
    const channel = useWatch({
        control: form.control,
        name: 'channel',
    })
    subscriptions = useMemo(() => channel ? subscriptions.filter(s => s.channel === channel) : [], [channel, subscriptions])
    useEffect(() => {
        if (channel && subscriptions.length) {
            const { subscription_id } = form.getValues()
            if (!subscription_id || !subscriptions.find(s => s.id === subscription_id)) {
                form.setValue('subscription_id', subscriptions[0].id)
            }
        }
    }, [channel, form, subscriptions])
    return (
        <SingleSelect.Field
            form={form}
            name="subscription_id"
            label={t('subscription_group')}
            options={subscriptions}
            required
            toValue={x => x.id}
        />
    )
}

const ProviderSelection = ({ providers, form }: { providers: Provider[], form: UseFormReturn<CampaignCreateParams> }) => {
    const { t } = useTranslation()
    const channel = useWatch({
        control: form.control,
        name: 'channel',
    })
    providers = useMemo(() => channel ? providers.filter(p => p.group === channel) : [], [channel, providers])
    useEffect(() => {
        if (channel && providers.length) {
            const { provider_id } = form.getValues()
            if (!provider_id || !providers.find(p => p.id === provider_id)) {
                form.setValue('provider_id', providers[0].id)
            }
        }
    }, [channel, form, providers])
    return (
        <SingleSelect.Field
            form={form}
            name="provider_id"
            label={t('provider')}
            options={providers}
            required
            toValue={x => x.id}
        />
    )
}

const TypeSelection = ({ campaign, showType, form }: { campaign?: Campaign, showType: boolean, form: UseFormReturn<CampaignCreateParams> }) => {
    const { t } = useTranslation()
    const type = useWatch({
        control: form.control,
        name: 'type',
    })
    const options = [{
        key: 'blast',
        label: t('blast'),
    }, {
        key: 'trigger',
        label: t('trigger'),
    }]

    return <>
        {showType && <RadioInput.Field
            form={form}
            name="type"
            subtitle={t('campaign_form_type')}
            label={t('type')}
            options={options}
            required
        />}
        {
            type !== 'trigger' && (
                <>
                    <Heading size="h3" title={t('lists')}>{t('campaign_form_lists')}</Heading>
                    <ListSelection
                        title={t('send_lists')}
                        name="list_ids"
                        value={campaign?.lists}
                        control={form.control}
                        required={true}
                    />
                    <ListSelection
                        title={t('exclusion_lists')}
                        name="exclusion_list_ids"
                        value={campaign?.exclusion_lists}
                        control={form.control}
                        required={false}
                    />
                </>
            )
        }
    </>
}

export function CampaignForm({ campaign, onSave, type }: CampaignEditParams) {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)

    const [providers, setProviders] = useState<Provider[]>([])
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    useEffect(() => {
        const params: SearchParams = { limit: 9999, q: '' }
        api.subscriptions.search(project.id, params)
            .then(({ results }) => {
                setSubscriptions(results)
            })
            .catch(() => {})

        api.providers.all(project.id)
            .then((results) => {
                setProviders(results)
            })
            .catch(() => {})
    }, [])

    async function handleSave({
        name,
        type,
        list_ids,
        exclusion_list_ids,
        channel,
        provider_id,
        subscription_id,
        tags,
    }: CampaignCreateParams) {
        const params = { name, list_ids, exclusion_list_ids, subscription_id, tags }
        const value = campaign
            ? await api.campaigns.update(project.id, campaign.id, params)
            : await api.campaigns.create(project.id, { channel, provider_id, type, ...params })
        onSave(value)
    }

    return (
        <FormWrapper<CampaignCreateParams>
            onSubmit={async (item) => await handleSave(item)}
            defaultValues={campaign ?? { type: type ?? 'blast' }}
            submitLabel={t('save')}
        >
            {form => (
                <>
                    <TextInput.Field form={form}
                        name="name"
                        label={t('campaign_name')}
                        required
                    />
                    <TagPicker.Field
                        form={form}
                        name="tags"
                        label={t('tags')}
                    />
                    <TypeSelection
                        campaign={campaign}
                        form={form}
                        showType={!type} />
                    {
                        campaign
                            ? (
                                <>
                                    <Heading size="h3" title={t('channel')}>{t('campaign_form_channel_description', { channel: campaign.channel })}</Heading>
                                    <SubscriptionSelection
                                        subscriptions={subscriptions}
                                        form={form}
                                    />
                                </>
                            )
                            : (
                                <>
                                    <Heading size="h3" title={t('channel')}>{t('campaign_form_channel_instruction')} </Heading>
                                    <ChannelSelection
                                        subscriptions={subscriptions}
                                        form={form}
                                    />
                                    {providers.length
                                        ? <Columns>
                                            <Column>
                                                <ProviderSelection
                                                    providers={providers}
                                                    form={form}
                                                />
                                            </Column>
                                            <Column>
                                                <SubscriptionSelection
                                                    subscriptions={subscriptions}
                                                    form={form}
                                                />
                                            </Column>
                                        </Columns>
                                        : <Alert
                                            variant="plain"
                                            title={t('no_providers')}
                                            actions={
                                                <LinkButton to={`/projects/${project.id}/settings/integrations`}>{t('setup_integration')}</LinkButton>
                                            }>{t('setup_integration_no_providers')}</Alert>
                                    }
                                </>
                            )
                    }
                </>
            )}
        </FormWrapper>
    )
}
