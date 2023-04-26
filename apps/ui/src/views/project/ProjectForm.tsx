import api from '../../api'
import TextInput from '../../ui/form/TextInput'
import { Project } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'
import Heading from '../../ui/Heading'

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
    const defaults = project ?? {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
    return (
        <FormWrapper<Project>
            defaultValues={defaults}
            onSubmit={async ({ id, name, description, locale, timezone, defaults }) => {
                const project = id
                    ? await api.projects.update(id, { name, description, locale, timezone, defaults })
                    : await api.projects.create({ name, description, locale, timezone, defaults })
                onSave?.(project)
            }}
        >
            {
                form => (
                    <>
                        <TextInput.Field form={form} name="name" required />
                        <TextInput.Field form={form} name="description" textarea />
                        <TextInput.Field
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

                        <Heading size="h4" title="Defaults">
                            Values that will prefill campaigns as the defaults.
                        </Heading>
                        <TextInput.Field
                            form={form}
                            name="defaults.from.name"
                            label="Email From Name"
                            subtitle="The name emails will show as sent from."
                        />
                        <TextInput.Field
                            form={form}
                            name="defaults.from.address"
                            label="Email From Address"
                            subtitle="The email address emails will be sent from."
                        />
                    </>
                )
            }
        </FormWrapper>
    )
}
