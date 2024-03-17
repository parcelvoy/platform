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
    const [project] = useContext(ProjectContext)
    const [isOpen, setIsOpen] = useState(false)
    const [lists, setLists] = useState<List[]>(value ?? [])
    const search = useCallback(async (params: SearchParams) => await api.lists.search(project.id, params), [project])

    const handlePickList = (list: List) => {
        if (list.state !== 'ready') {
            if (!confirm('This list is still generating. Sending before it has completed could result in this campaign not sending to all users who will enter the list. Are you sure you want to continue?')) return
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
                    onClick={() => setIsOpen(true)}>Add List</Button>
            } />
            <DataTable
                items={lists}
                itemKey={({ item }) => item.id}
                columns={[
                    { key: 'name' },
                    {
                        key: 'type',
                        cell: ({ item: { type } }) => snakeToTitle(type),
                    },
                    {
                        key: 'users_count',
                        cell: ({ item }) => item.users_count?.toLocaleString(),
                    },
                    { key: 'updated_at' },
                    {
                        key: 'options',
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={() => handleRemoveList(item)}>
                                Remove
                            </Button>
                        ),
                    },
                ]}
                emptyMessage="Select one or more lists using the button above."
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
    const channels = [...new Set(subscriptions.map(item => item.channel))].map(item => ({
        key: item,
        label: snakeToTitle(item),
    }))
    return (
        <RadioInput.Field
            form={form}
            name="channel"
            label="Medium"
            options={channels}
            required
        />
    )
}

const SubscriptionSelection = ({ subscriptions, form }: { subscriptions: Subscription[], form: UseFormReturn<CampaignCreateParams> }) => {
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
            label="Subscription Group"
            options={subscriptions}
            required
            toValue={x => x.id}
        />
    )
}

const ProviderSelection = ({ providers, form }: { providers: Provider[], form: UseFormReturn<CampaignCreateParams> }) => {
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
            label="Provider"
            options={providers}
            required
            toValue={x => x.id}
        />
    )
}

const TypeSelection = ({ campaign, form }: { campaign?: Campaign, form: UseFormReturn<CampaignCreateParams> }) => {
    const type = useWatch({
        control: form.control,
        name: 'type',
    })

    return <>
        <RadioInput.Field
            form={form}
            name="type"
            subtitle="Should a campaign be sent to as a blast to a list of users or triggered individually via API."
            label="Type"
            options={['blast', 'trigger'].map(item => ({ key: item, label: snakeToTitle(item) }))}
            required
        />
        {
            type !== 'trigger' && (
                <>
                    <Heading size="h3" title="Lists">
                        Select what lists to send this campaign to and what user lists you want to exclude from getting the campaign.
                    </Heading>
                    <ListSelection
                        title="Send Lists"
                        name="list_ids"
                        value={campaign?.lists}
                        control={form.control}
                        required={true}
                    />
                    <ListSelection
                        title="Exclusion Lists"
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

export function CampaignForm({ campaign, onSave }: CampaignEditParams) {
    const [project] = useContext(ProjectContext)

    const [providers, setProviders] = useState<Provider[]>([])
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    useEffect(() => {
        const params: SearchParams = { limit: 9999, q: '' }
        api.subscriptions.search(project.id, params)
            .then(({ results }) => {
                console.log('set subscriptions!')
                setSubscriptions(results)
            })
            .catch(() => {})

        api.providers.all(project.id)
            .then((results) => {
                console.log('set providers!')
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
            defaultValues={campaign ?? { type: 'blast' }}
            submitLabel="Save"
        >
            {form => (
                <>
                    <TextInput.Field form={form}
                        name="name"
                        label="Campaign Name"
                        required
                    />
                    <TagPicker.Field
                        form={form}
                        name="tags"
                    />
                    <TypeSelection campaign={campaign} form={form} />
                    {
                        campaign
                            ? (
                                <>
                                    <Heading size="h3" title="Channel">
                                        This campaign is being sent over the <strong>{campaign.channel}</strong> channel. Set the subscription group this message will be associated to.
                                    </Heading>
                                    <SubscriptionSelection
                                        subscriptions={subscriptions}
                                        form={form}
                                    />
                                </>
                            )
                            : (
                                <>
                                    <Heading size="h3" title="Channel">
                                        Setup the channel this campaign will go out on. The medium is the type of message, provider the sender that will process the message and subscription group the unsubscribe group associated to the campaign.
                                    </Heading>
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
                                            title="No Providers"
                                            actions={
                                                <LinkButton to={`/projects/${project.id}/settings/integrations`}>Setup Integration</LinkButton>
                                            }>There are no providers configured for this channel. Please add a provider to continue.</Alert>
                                    }
                                </>
                            )
                    }
                </>
            )}
        </FormWrapper>
    )
}
