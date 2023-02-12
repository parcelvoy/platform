import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Campaign, CampaignCreateParams, Project, Provider, SearchParams, Subscription } from '../../types'
import { Control, FieldPath, FieldValues, useController, UseFormReturn } from 'react-hook-form'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/FormWrapper'
import Heading from '../../ui/Heading'
import Modal from '../../ui/Modal'
import ListTable from '../users/ListTable'
import SelectField from '../../ui/form/SelectField'
import { snakeToTitle } from '../../utils'
import OptionField from '../../ui/form/OptionField'

interface CampaignEditParams {
    campaign?: Campaign
    open: boolean
    onClose: (open: boolean) => void
    onSave: (campaign: Campaign) => void
}

interface SelectionProps<X extends FieldValues> {
    project: Project
    name: FieldPath<X>
    control: Control<X, any> | undefined
}

const ListSelection = ({ project, name, control }: SelectionProps<CampaignCreateParams>) => {
    const lists = useCallback(async (params: SearchParams) => await api.lists.search(project.id, params), [api.lists, project])

    const { field: { value, onChange } } = useController({ name, control, rules: { required: true } })

    return <ListTable
        search={lists}
        selectedRow={value}
        onSelectRow={(id) => onChange(id)} />
}

const ChannelSelection = ({ subscriptions, form }: {
    subscriptions: Subscription[]
    form: UseFormReturn<CampaignCreateParams>
}) => {
    const channels = [...new Set(subscriptions.map(item => item.channel))].map(item => ({
        key: item,
        label: snakeToTitle(item),
    }))
    return <OptionField
        form={form}
        name="channel"
        label="Medium"
        options={channels}
        required />
}

const SubscriptionSelection = ({ subscriptions, form }: { subscriptions: Subscription[], form: UseFormReturn<CampaignCreateParams> }) => {
    const { channel } = form.getValues()
    const watchChannel = form.watch(['channel'])
    const options = useMemo(() => subscriptions.filter(item => item.channel === channel).map(item => ({
        key: item.id,
        label: item.name,
    })), watchChannel)

    return <SelectField
        form={form}
        name="subscription_id"
        label="Subscription Group"
        options={options}
        required />
}

const ProviderSelection = ({ providers, form }: { providers: Provider[], form: UseFormReturn<CampaignCreateParams> }) => {
    const { channel } = form.getValues()
    const watchChannel = form.watch(['channel'])
    const options = useMemo(() => providers.filter(item => item.group === channel).map(item => ({
        key: item.id,
        label: item.name,
    })), watchChannel)

    return <SelectField
        form={form}
        name="provider_id"
        label="Provider"
        options={options}
        required />
}

export default function CampaignEditModal({ campaign, open, onClose, onSave }: CampaignEditParams) {
    const [project] = useContext(ProjectContext)

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    useEffect(() => {
        const params: SearchParams = { page: 0, itemsPerPage: 9999, q: '' }
        api.subscriptions.search(project.id, params)
            .then(({ results }) => {
                setSubscriptions(results)
            })
            .catch(() => {})
    }, [])

    const [providers, setProviders] = useState<Provider[]>([])
    useEffect(() => {
        api.providers.all(project.id)
            .then((results) => {
                setProviders(results)
            })
            .catch(() => {})
    }, [])

    async function handleSave({ name, list_id, channel, provider_id, subscription_id }: CampaignCreateParams) {
        const value = campaign
            ? await api.campaigns.update(project.id, campaign.id, { name, list_id, subscription_id })
            : await api.campaigns.create(project.id, { name, list_id, channel, provider_id, subscription_id })
        onSave(value)
        onClose(false)
    }

    return <Modal title={campaign ? 'Edit Campaign' : 'Create Campaign'}
        open={open}
        onClose={() => onClose(false)}
        size="large">
        <FormWrapper<CampaignCreateParams>
            onSubmit={async (item) => await handleSave(item)}
            defaultValues={campaign}
            submitLabel="Save">
            {form => <>
                <TextField form={form}
                    name="name"
                    label="Campaign Name"
                    required />
                <Heading size="h3" title="List">
                    Who is this campaign going to? Pick a list to send your campaign to.
                </Heading>
                <ListSelection
                    project={project}
                    name="list_id"
                    control={form.control} />

                { campaign
                    ? <>
                        <Heading size="h3" title="Channel">
                            This campaign is being sent over the <strong>{campaign.channel}</strong> channel. Set the subscription group this message will be associated to.
                        </Heading>
                        <SubscriptionSelection
                            subscriptions={subscriptions}
                            form={form} />
                    </>
                    : <>
                        <Heading size="h3" title="Channel">
                            Setup the channel this campaign will go out on. The medium is the type of message, provider the sender that will process the message and subscription group the unsubscribe group associated to the campaign.
                        </Heading>
                        <ChannelSelection
                            subscriptions={subscriptions}
                            form={form} />
                        <ProviderSelection
                            providers={providers}
                            form={form} />
                        <SubscriptionSelection
                            subscriptions={subscriptions}
                            form={form} />
                    </>
                }
            </>}
        </FormWrapper>
    </Modal>
}
