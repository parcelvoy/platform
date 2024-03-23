import { JourneyStepType } from '../../../types'
import SourceEditor from '../../../ui/SourceEditor'
import { UpdateStepIcon } from '../../../ui/icons'
import { JsonPreview } from '../../../ui'
import { useTranslation } from 'react-i18next'

interface UpdateConfig {
    template: string // handlebars template for json object
}

export const updateStep: JourneyStepType<UpdateConfig> = {
    name: 'user_update',
    icon: <UpdateStepIcon />,
    category: 'action',
    description: 'user_update_desc',
    Describe({ value }) {
        const { t } = useTranslation()
        if (value?.template) {
            try {
                const parsed = JSON.parse(value.template)
                return (
                    <JsonPreview value={parsed} />
                )
            } catch {
                return <>{t('user_update_empty')}</>
            }
        }
        return null
    },
    newData: async () => ({
        template: '{\n\n}\n',
    }),
    Edit: ({ onChange, value }) => {
        const { t } = useTranslation()
        return (
            <>
                <p style={{ maxWidth: 400 }}>
                    {t('user_update_edit_desc1')}
                    {t('user_update_edit_desc2')}<code>{'user'}</code>
                    {t('user_update_edit_desc3')}<code>{'journey[data_key]'}</code>{'.'}
                </p>
                <SourceEditor
                    onChange={(template = '') => onChange({ ...value, template })}
                    value={value.template ?? ''}
                    height={500}
                    width="400px"
                    language="handlebars"
                />
            </>
        )
    },
}
