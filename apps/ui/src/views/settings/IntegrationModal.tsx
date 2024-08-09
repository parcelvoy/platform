import { useCallback, useContext, useEffect, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { Project, Provider, ProviderCreateParams, ProviderMeta, ProviderUpdateParams } from '../../types'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import SchemaFields from '../../ui/form/SchemaFields'
import TextInput from '../../ui/form/TextInput'
import RadioInput from '../../ui/form/RadioInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal, { ModalProps } from '../../ui/Modal'
import Tile, { TileGrid } from '../../ui/Tile'
import { snakeToTitle } from '../../utils'
import './IntegrationModal.css'
import { ChevronLeftIcon } from '../../ui/icons'
import { useTranslation } from 'react-i18next'

interface IntegrationFormParams {
    project: Project
    meta: ProviderMeta
    provider?: Provider
    onChange: (provider: Provider) => void
}

export function IntegrationForm({ project, provider: defaultProvider, onChange, meta }: IntegrationFormParams) {
    const { t } = useTranslation()
    const [provider, setProvider] = useState<Provider | undefined>(defaultProvider)
    const { type, group } = meta
    useEffect(() => {
        if (defaultProvider) {
            api.providers.get(project.id, defaultProvider.group, defaultProvider.type, defaultProvider.id)
                .then(provider => {
                    setProvider(provider)
                })
                .catch(() => {})
        }
    }, [defaultProvider])

    async function handleCreate({ name, rate_limit, rate_interval, data = {} }: ProviderCreateParams | ProviderUpdateParams) {

        const params = { name, data, rate_limit, rate_interval, type, group }
        const value = provider?.id
            ? await api.providers.update(project.id, provider?.id, params)
            : await api.providers.create(project.id, params)

        onChange(value)
    }

    return (
        <FormWrapper<ProviderCreateParams>
            onSubmit={async provider => await handleCreate(provider)}
            submitLabel={provider?.id ? 'Update Integration' : 'Create Integration'}
            defaultValues={provider}>
            {form =>
                <>
                    {provider?.id
                        ? <>
                            {provider.setup.length > 0 && <h4>Details</h4>}
                            {provider.setup?.map(item => {
                                return (
                                    <TextInput
                                        name={item.name}
                                        key={item.name}
                                        value={item.value}
                                        disabled />
                                )
                            })}
                        </>
                        : <Alert title={meta.name} variant="plain">Fill out the fields below to setup this integration. For more information on this integration please see the documentation on our website</Alert>
                    }

                    <h4>Config</h4>
                    <TextInput.Field form={form} name="name" required />
                    <SchemaFields parent="data" schema={meta.schema.properties.data} form={form} />
                    <TextInput.Field
                        form={form}
                        type="number"
                        name="rate_limit"
                        subtitle="If you need to cap send rate, enter the maximum per interval limit." />
                    <RadioInput.Field
                        form={form}
                        name="rate_interval"
                        label={t('rate_interval')}
                        options={[
                            { key: 'second', label: t('second') },
                            { key: 'minute', label: t('minute') },
                            { key: 'hour', label: t('hour') },
                            { key: 'day', label: t('day') },
                        ]}
                    />
                </>
            }
        </FormWrapper>
    )
}

interface IntegrationModalProps extends Omit<ModalProps, 'title'> {
    provider: Provider | undefined
    onChange: (provider: Provider) => void
}

export default function IntegrationModal({ onChange, provider, ...props }: IntegrationModalProps) {
    const [project] = useContext(ProjectContext)
    const [options] = useResolver(useCallback(async () => await api.providers.options(project.id), [project, open]))
    const [meta, setMeta] = useState<ProviderMeta | undefined>()

    useEffect(() => {
        setMeta(options?.find(item => item.group === provider?.group && item.type === provider?.type))
    }, [provider])

    const handleChange = (provider: Provider) => {
        onChange(provider)
        props.onClose(false)
        setMeta(undefined)
    }

    return <Modal
        {...props}
        title={meta
            ? provider?.id
                ? `${provider?.name} (${meta.name})`
                : 'Setup Integration'
            : 'Integrations'
        }
        size="regular"
    >
        {!meta
            ? (<>
                <p>To get started, pick one of the integrations from the list below.</p>
                <TileGrid>
                    {options?.map(option => (
                        <Tile
                            key={`${option.group}${option.type}`}
                            title={option.name}
                            onClick={() => setMeta(option)}
                            iconUrl={option.icon}
                        >
                            {snakeToTitle(option.group)}
                        </Tile>
                    ))}
                </TileGrid>
            </>)
            : (<>
                {!provider?.id && <div style={{ marginBottom: '10px' }}>
                    <Button
                        icon={<ChevronLeftIcon />}
                        variant="secondary"
                        size="small"
                        onClick={() => setMeta(undefined)}>Integrations</Button>
                </div>}
                <IntegrationForm
                    project={project}
                    provider={provider}
                    meta={meta}
                    onChange={handleChange} />
            </>)
        }
    </Modal>
}
