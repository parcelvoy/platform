import { JourneyStepType } from '../../../types'
import { StickyStepIcon } from '../../../ui/icons'
import { useTranslation } from 'react-i18next'
import TextInput from '../../../ui/form/TextInput'

interface StickyConfig {
    text?: string
}

export const stickyStep: JourneyStepType<StickyConfig> = {
    name: 'sticky',
    icon: <StickyStepIcon />,
    category: 'info',
    description: 'sticky_desc',
    Describe({
        value,
    }) {
        return (
            <div style={{ maxWidth: 300 }}>
                {value.text}
            </div>
        )
    },
    Edit({
        onChange,
        value,
    }) {
        const { t } = useTranslation()
        return (
            <TextInput
                name="sticky_text"
                label={t('sticky_text_label')}
                value={value.text ?? ''}
                onChange={(text) => onChange({ ...value, text })} // Update the text field
                textarea
            />
        )
    },
    hideBottomHandle: true,
    hideTopHandle: true,
}
