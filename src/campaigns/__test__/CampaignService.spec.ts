import { sendList } from '../CampaignService'
import { User } from '../../models/User'
import Journey from '../Journey'
import { lastJourneyStep } from '../JourneyRepository'
import JourneyService from '../JourneyService'
import { JourneyEntrance, JourneyMap } from '../JourneyStep'
import Campaign from '../Campaign'
import List from '../../lists/List'
import Project from '../../models/Project'

describe('sendList', () => {
    test('ensure all users are run over', async () => {
        const campaign = new Campaign()
        const project = await Project.insertAndFetch()
        const list = List.insert({
            project_id: project.id,

        })
        sendList(campaign, )
    })
})
