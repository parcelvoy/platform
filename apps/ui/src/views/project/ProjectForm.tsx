import api from '../../api'
import TextInput from '../../ui/form/TextInput'
import { Project } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'
import SwitchField from '../../ui/form/SwitchField'
import Heading from '../../ui/Heading'
import { LocaleTextField } from '../settings/Locales'
import { useTranslation } from 'react-i18next'

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Intl {
    type Key = 'calendar' | 'collation' | 'currency' | 'numberingSystem' | 'timeZone' | 'unit'
    function supportedValuesOf(input: Key): string[]

    interface DateTimeFormat {
        // eslint-disable-next-line @typescript-eslint/method-signature-style
        format(date?: Date | number): string
        // eslint-disable-next-line @typescript-eslint/method-signature-style
        resolvedOptions(): ResolvedDateTimeFormatOptions
    }

    interface ResolvedDateTimeFormatOptions {
        locale: string
        timeZone: string
        timeZoneName?: string
    }

    // eslint-disable-next-line no-var
    var DateTimeFormat: {
        new(locales?: string | string[]): DateTimeFormat
        (locales?: string | string[]): DateTimeFormat
    }
}

interface ProjectFormProps {
    project?: Project
    onSave?: (project: Project) => void
}

export default function ProjectForm({ project, onSave }: ProjectFormProps) {
    const { t } = useTranslation()
    const timeZones = Intl.supportedValuesOf('timeZone')
    const locale = navigator.languages[0]?.split('-')[0] ?? 'en'
    const defaults = project ?? {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale,
    }
    return (
        <FormWrapper<Project>
            defaultValues={defaults}
            onSubmit={async ({ id, name, description, locale, timezone, text_opt_out_message, text_help_message, link_wrap_email, link_wrap_push }) => {

                const params = { name, description, locale, timezone, text_opt_out_message, text_help_message, link_wrap_email, link_wrap_push }

                const project = id
                    ? await api.projects.update(id, params)
                    : await api.projects.create(params)
                onSave?.(project)
            }}
            submitLabel={project ? t('save_settings') : t('create_project')}
        >
            {
                form => (
                    <>
                        <TextInput.Field form={form} name="name" label={t('name')} required />
                        <TextInput.Field form={form} name="description" label={t('description')} textarea />
                        <Heading size="h4" title={t('defaults')} />
                        <LocaleTextField
                            form={form}
                            name="locale"
                            label={t('default_locale')}
                            subtitle={t('default_locale_description')}
                            required />
                        <SingleSelect.Field
                            form={form}
                            options={timeZones}
                            name="timezone"
                            label={t('timezone')}
                            required
                        />
                        <Heading size="h4" title={t('message_settings')} />
                        <TextInput.Field
                            form={form}
                            name="text_opt_out_message"
                            label={t('sms_opt_out_message')}
                            subtitle={t('sms_opt_out_message_subtitle')} />
                        <TextInput.Field
                            form={form}
                            name="text_help_message"
                            label={t('sms_help_message')}
                            subtitle={t('sms_help_message_subtitle')} />
                        <SwitchField
                            form={form}
                            name="link_wrap_email"
                            label={t('link_wrapping_email')}
                            subtitle={t('link_wrapping_email_subtitle')} />
                        <SwitchField
                            form={form}
                            name="link_wrap_push"
                            label={t('link_wrapping_push')}
                            subtitle={t('link_wrapping_push_subtitle')} />
                    </>
                )
            }
        </FormWrapper>
    )
}
