import { JourneyStepType } from '../../../types'
import TextInput from '../../../ui/form/TextInput'
import { ExperimentStepIcon } from '../../../ui/icons'
import { round } from '../../../utils'
import { useTranslation } from 'react-i18next'

interface ExperimentStepChildConfig {
    ratio: number
}

export const experimentStep: JourneyStepType<{}, ExperimentStepChildConfig> = {
    name: 'experiment',
    icon: <ExperimentStepIcon />,
    category: 'flow',
    description: 'experiment_desc',
    Describe: () => {
        const { t } = useTranslation()
        return <>{t('experiment_default')}</>
    },
    newEdgeData: async () => ({ ratio: 1 }),
    Edit: () => {
        const { t } = useTranslation()
        return (
            <div style={{ maxWidth: 300 }}>{t('experiment_edit_desc')}</div>
        )
    },
    EditEdge({
        siblingData,
        onChange,
        value,
    }) {
        const { t } = useTranslation()
        const ratio = value.ratio ?? 0
        const totalRatio = siblingData.reduce((a, c) => a + c.ratio ?? 0, ratio)
        const percentage = totalRatio > 0 ? round(ratio / totalRatio * 100, 2) : 0
        return (
            <TextInput
                name="ratio"
                label={t('ratio')}
                subtitle={t('experiment_ratio_desc', { percentage })}
                type="number"
                size="small"
                value={value.ratio ?? 0}
                onChange={ratio => onChange({ ...value, ratio })}
            />
        )
    },
    multiChildSources: true,
}
