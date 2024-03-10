import api from '../../api'
import TextInput from '../../ui/form/TextInput'
import { Project } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'
import SwitchField from '../../ui/form/SwitchField'
import Heading from '../../ui/Heading'
import { LocaleTextField } from '../settings/Locales'

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
    const timeZones = Intl.supportedValuesOf('timeZone')
    const locale = navigator.languages[0]?.split('-')[0] ?? 'en'
    const defaults = project ?? {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale,
    }
    return (
        <FormWrapper<Project>
            defaultValues={defaults}
            onSubmit={async ({ id, name, description, locale, timezone, text_opt_out_message, link_wrap }) => {

                const params = { name, description, locale, timezone, text_opt_out_message, link_wrap }

                const project = id
                    ? await api.projects.update(id, params)
                    : await api.projects.create(params)
                onSave?.(project)
            }}
            submitLabel={project ? 'Save Settings' : 'Create Project'}
        >
            {
                form => (
                    <>
                        <TextInput.Field form={form} name="name" required />
                        <TextInput.Field form={form} name="description" textarea />
                        <Heading size="h4" title="Defaults" />
                        <LocaleTextField
                            form={form}
                            name="locale"
                            label="Default Locale"
                            subtitle="This locale will be used as the default when creating campaigns and when a users locale does not match any available ones."
                            required />
                        <SingleSelect.Field
                            form={form}
                            options={timeZones}
                            name="timezone"
                            label="Timezone"
                            required
                        />
                        <Heading size="h4" title="Message Settings" />
                        <TextInput.Field
                            form={form}
                            name="text_opt_out_message"
                            label="SMS Opt Out Message"
                            subtitle="Instructions on how to opt out of SMS that will be appended to every text." />
                        <SwitchField form={form} name="link_wrap" label="Link Wrapping" subtitle="Enable link wrapping for all links in messages." />
                    </>
                )
            }
        </FormWrapper>
    )
}
