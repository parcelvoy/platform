import Organization from '../../organizations/Organization'
import Project from '../../projects/Project'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import Journey from '../Journey'
import { JourneyStepMap } from '../JourneyStep'

export const setupProject = async () => {
    const org = await Organization.insertAndFetch({})
    const project = await Project.insertAndFetch({
        organization_id: org.id,
        name: `Project ${Date.now()}`,
    })
    return { org, project }
}

interface SetupJourneyParams {
    data: Record<string, unknown>
    events?: Array<{
        name: string
        data: Record<string, unknown>
    }>
    stepMap: JourneyStepMap
}

export const setupTestJourney = async ({ data, events, stepMap }: SetupJourneyParams) => {

    const { project } = await setupProject()

    const { journey, steps } = await Journey.create(project.id, 'Test Journey', stepMap)

    const user = await User.insertAndFetch({
        project_id: project.id,
        external_id: Date.now().toString(),
        data,
        timezone: 'America/Chicago',
    })

    if (events?.length) {
        await UserEvent.insert(events.map(({ name, data }) => ({
            project_id: project.id,
            user_id: user.id,
            name,
            data,
        })))
    }

    return { journey, project, steps, user }
}
