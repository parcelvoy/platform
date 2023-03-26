import { useCallback, useContext, useEffect, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { Provider, ProviderCreateParams, ProviderMeta, ProviderUpdateParams } from '../../types'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import SchemaFields from '../../ui/form/SchemaFields'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal, { ModalProps } from '../../ui/Modal'
import Tile, { TileGrid } from '../../ui/Tile'
import { snakeToTitle } from '../../utils'
import './IntegrationModal.css'
import { ChevronLeftIcon } from '../../ui/icons'

interface IntegrationModalProps extends Omit<ModalProps, 'title'> {
    provider: Provider | undefined
    onChange: (provider: Provider) => void
}

export default function IntegrationModal({ onChange, provider, ...props }: IntegrationModalProps) {
    const [project] = useContext(ProjectContext)
    const [options] = useResolver(useCallback(async () => await api.providers.options(project.id), [project, open]))
    const [meta, setMeta] = useState<ProviderMeta | undefined>()
    useEffect(() => {
        setMeta(options?.find(item => item.channel === provider?.group && item.type === provider?.type))
    }, [provider])

    async function handleCreate({ name, data = {} }: ProviderCreateParams | ProviderUpdateParams, meta: ProviderMeta) {

        const value = provider?.id
            ? await api.providers.update(project.id, provider?.id, { name, data, type: meta.type, group: meta.channel })
            : await api.providers.create(project.id, { name, data, type: meta.type, group: meta.channel })

        onChange(value)
        props.onClose(false)
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
        {!meta && <>
            <p>To get started, pick one of the integrations from the list below.</p>
            <TileGrid>
                {options?.map(option => (
                    <Tile
                        key={`${option.channel}${option.type}`}
                        title={option.name}
                        onClick={() => setMeta(option)}
                        iconUrl={option.icon}
                    >
                        {snakeToTitle(option.channel)}
                    </Tile>
                ))}
            </TileGrid>
        </>}
        {meta && <>
            {!provider?.id && <div style={{ marginBottom: '10px' }}>
                <Button
                    icon={<ChevronLeftIcon />}
                    variant="secondary"
                    size="small"
                    onClick={() => setMeta(undefined)}>Integrations</Button>
            </div>}
            <FormWrapper<ProviderCreateParams>
                onSubmit={async provider => await handleCreate(provider, meta)}
                submitLabel={provider?.id ? 'Update Integration' : 'Create Integration'}
                defaultValues={provider}>
                {form =>
                    <>
                        {provider?.id
                            ? <>
                                <h4>Details</h4>
                                <TextField name="id" label="ID" value={provider.id} disabled />
                                {meta.paths && Object.keys(meta.paths).map(key => {
                                    const value = meta.paths?.[key]
                                    const url = `${window.location.origin}/providers/${provider?.id}${value}`
                                    return <TextField name="unsubscribe" key={key} label={key} value={url} disabled />
                                })}
                            </>
                            : <Alert title={meta.name} variant="plain">Fill out the fields below to setup this integration. For more information on this integration please see the documentation on our website</Alert>
                        }

                        <h4>Config</h4>
                        <TextField form={form} name="name" required />
                        <SchemaFields parent="data" schema={meta.schema.properties.data} form={form} />
                    </>
                }
            </FormWrapper>
        </>}
    </Modal>
}
