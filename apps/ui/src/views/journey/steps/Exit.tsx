import { JourneyStepType } from '../../../types'
import { CloseIcon } from '../../../ui/icons'
import { useTranslation } from 'react-i18next'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { snakeToTitle } from '../../../utils'
import { Node, useReactFlow } from 'reactflow'

interface ExitConfig {
    entrance_uuid?: string
}

// type StepList = Array<{ id: string, label: string }>
const entranceName = ({ data: { type, name, data_key } }: Node) => {
    const stepName = name || snakeToTitle(type)
    return data_key
        ? `${stepName} (${data_key})`
        : stepName
}

export const exitStep: JourneyStepType<ExitConfig> = {
    name: 'exit',
    icon: <CloseIcon />,
    category: 'exit',
    description: 'exit_desc',
    Describe({
        value,
    }) {
        const { t } = useTranslation()
        const { getNode } = useReactFlow()
        if (!value.entrance_uuid) return <></>
        const node = getNode(value.entrance_uuid)
        if (!node) return <></>
        return (
            <div style={{ maxWidth: 300 }}>
                {t('exit_step_default', { name: entranceName(node) })}
            </div>
        )
    },
    Edit({
        onChange,
        value,
        nodes,
    }) {
        const { t } = useTranslation()
        const steps = nodes
            .filter(item => item.data.type === 'entrance')
            .map((node) => ({ id: node.id, label: entranceName(node) }))
        return (
            <SingleSelect
                options={steps}
                label={t('exit_entrance_label')}
                subtitle={t('exit_entrance_desc')}
                value={value.entrance_uuid}
                onChange={(entrance_uuid) => onChange({ entrance_uuid })}
                toValue={x => x.id}
            />
        )
    },
}
