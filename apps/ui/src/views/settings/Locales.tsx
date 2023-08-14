import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { Locale, LocaleOption } from '../../types'
import TextInput from '../../ui/form/TextInput'
import { UseFormReturn } from 'react-hook-form'
import Button from '../../ui/Button'
import { PlusIcon } from '../../ui/icons'
import { languageName } from '../../utils'

const LocaleTextField = ({ form }: { form: UseFormReturn<{ key: string }> }) => {

    const [language, setLanguage] = useState<string | undefined>(undefined)
    const handlePreviewLanguage = (locale: string) => {
        try {
            return setLanguage(languageName(locale))
        } catch {
            return setLanguage(undefined)
        }
    }

    return <>
        <TextInput.Field form={form}
            name="key"
            label="Locale"
            subtitle="The abbreviated language code i.e. en, es, fr"
            onChange={handlePreviewLanguage}
            required />
        <p>{language}</p>
    </>
}

export default function Locales() {
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.locales.search(project.id, params), [project]))
    const [open, setOpen] = useState(false)
    const handleDeleteLocale = async (locale: Locale) => {
        if (!confirm('Are you sure you want to delete this locale? No existing templates will be deleted, this language option will just not be present for future templates.')) return
        await api.locales.delete(project.id, locale.id)
        await state.reload()
    }

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'key' },
                    { key: 'label' },
                    {
                        key: 'options',
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={async () => await handleDeleteLocale(item)}>
                                Delete
                            </Button>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.key}
                title="Locales"
                actions={
                    <>
                        <Button
                            variant="primary"
                            icon={<PlusIcon />}
                            size="small"
                            onClick={() => setOpen(true)}
                        >
                            Create Locale
                        </Button>
                    </>
                }
            />
            <Modal
                title="Create Locale"
                open={open}
                onClose={() => setOpen(false)}
            >
                <FormWrapper<Pick<LocaleOption, 'key'>>
                    onSubmit={async ({ key }) => {
                        await api.locales.create(project.id, { key, label: languageName(key) ?? key })
                        await state.reload()
                        setOpen(false)
                    }}
                >
                    {
                        form => (
                            <>
                                <LocaleTextField form={form} />
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </>
    )
}
