import { JourneyStepType } from '../../../types'

interface JourneyLinkConfig {
    target_id: number
}

export const journeyLinkStep: JourneyStepType<JourneyLinkConfig> = {
    name: 'Link',
    icon: 'bi-box-arrow-up-right',
    category: 'action',
    description: 'Send users to another journey.',
    newData: async () => ({ target_id: 0 }),
    Edit() {
        return (
            <div>
                TODO
            </div>
        )
    },
}
