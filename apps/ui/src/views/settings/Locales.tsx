import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { Locale, LocaleOption, FieldProps } from '../../types'
import TextInput, { TextInputProps } from '../../ui/form/TextInput'
import { FieldPath, FieldValues } from 'react-hook-form'
import Button from '../../ui/Button'
import { PlusIcon } from '../../ui/icons'
import { languageName } from '../../utils'
import { useTranslation } from 'react-i18next'

export const LocaleTextField = <X extends FieldValues, P extends FieldPath<X>>(params: TextInputProps<P> & FieldProps<X, P>) => {

    const [language, setLanguage] = useState<string | undefined>(languageName(params.form.getValues()[params.name]))
    const handlePreviewLanguage = (locale: string) => {
        setLanguage(languageName(locale))
    }

    return <>
        <TextInput.Field {...params}
            onChange={handlePreviewLanguage}
            suffix={language} />
    </>
}

export default function Locales() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.locales.search(project.id, params), [project]))
    const [open, setOpen] = useState(false)
    const handleDeleteLocale = async (locale: Locale) => {
        if (!confirm(t('locale_delete_confirmation'))) return
        await api.locales.delete(project.id, locale.id)
        await state.reload()
    }

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'key', title: t('key') },
                    { key: 'label', title: t('label') },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={async () => await handleDeleteLocale(item)}>
                                {t('delete')}
                            </Button>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.key}
                title={t('locale')}
                actions={
                    <>
                        <Button
                            variant="primary"
                            icon={<PlusIcon />}
                            size="small"
                            onClick={() => setOpen(true)}
                        >{t('create_locale')}</Button>
                    </>
                }
            />
            <Modal
                title={t('create_locale')}
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
                                <LocaleTextField
                                    form={form}
                                    name="key"
                                    label={t('locale')}
                                    subtitle={t('locale_field_subtitle')}
                                    required />
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </>
    )
}
