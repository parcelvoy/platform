import App from '../../app'
import EmailJob from '../../channels/email/EmailJob'
import { RequestError } from '../../core/errors'
import { addUserToList, createList } from '../../lists/ListService'
import { createProject } from '../../projects/ProjectService'
import { createTemplate } from '../../render/TemplateService'
import { createSubscription } from '../../subscriptions/SubscriptionService'
import { User } from '../../users/User'
import { uuid } from '../../utilities'
import Campaign from '../Campaign'
import { allCampaigns, createCampaign, getCampaign, sendCampaign, sendList } from '../CampaignService'
import * as CampaignService from '../CampaignService'

afterEach(() => {
    jest.clearAllMocks()
})

describe('CampaignService', () => {

    interface CampaignRefs {
        project_id: number
        template_id: number
        subscription_id: number
    }

    const createCampaignDependencies = async (): Promise<CampaignRefs> => {
        const project = await createProject({ name: uuid() })
        const subscription = await createSubscription(project.id, {
            name: uuid(),
            channel: 'email',
        })
        const template = await createTemplate(project.id, {
            name: uuid(),
            type: 'email',
            data: {},
        })
        return {
            project_id: project.id,
            subscription_id: subscription.id,
            template_id: template.id,
        }
    }

    const createTestCampaign = async (params?: CampaignRefs, extras?: Partial<Campaign>) => {
        params = params || await createCampaignDependencies()

        const campaign = await createCampaign(params.project_id, {
            name: uuid(),
            ...params,
            ...extras,
        })

        return campaign
    }

    const createUser = async (project_id: number): Promise<User> => {
        return await User.insertAndFetch({
            project_id,
            external_id: uuid(),
            data: {},
        })
    }

    describe('allCampaigns', () => {
        test('return a list of campaigns', async () => {

            const params = await createCampaignDependencies()

            for (let i = 0; i < 20; i++) {
                await createTestCampaign(params)
            }

            const campaigns = await allCampaigns(params.project_id)

            expect(campaigns.length).toEqual(20)
            expect(campaigns[0].template_id).toEqual(params.template_id)
            expect(campaigns[0].subscription_id).toEqual(params.subscription_id)
        })

        test('campaigns in other projects wont come back', async () => {

            const params1 = await createCampaignDependencies()
            const params2 = await createCampaignDependencies()

            for (let i = 0; i < 10; i++) {
                await createTestCampaign(params1)
            }

            for (let i = 0; i < 10; i++) {
                await createTestCampaign(params2)
            }

            const campaigns = await allCampaigns(params1.project_id)

            expect(campaigns.length).toEqual(10)
            expect(campaigns[0].template_id).toEqual(params1.template_id)
            expect(campaigns[0].subscription_id).toEqual(params1.subscription_id)
        })
    })

    describe('getCampaign', () => {
        test('return a single campaign', async () => {
            const response = await createTestCampaign()

            const campaign = await getCampaign(response.id, response.project_id)

            expect(campaign?.id).toEqual(response.id)
        })

        test('a single campaign in a different project shouldnt return', async () => {
            const response = await createTestCampaign()
            const badParams = await createCampaignDependencies()

            const campaign = await getCampaign(response.id, badParams.project_id)

            expect(campaign?.id).toBeUndefined()
        })
    })

    describe('createCampaign', () => {
        test('create a single campaign', async () => {
            const params = await createCampaignDependencies()
            const name = uuid()
            const campaign = await createCampaign(params.project_id, {
                ...params,
                name,
            })

            expect(campaign.name).toEqual(name)
            expect(campaign.subscription_id).toEqual(params.subscription_id)
            expect(campaign.project_id).toEqual(params.project_id)
            expect(campaign.template_id).toEqual(params.template_id)
        })

        test('fail to create a campaign with a bad subscription', async () => {
            const params = await createCampaignDependencies()
            const name = uuid()
            const promise = createCampaign(params.project_id, {
                template_id: params.template_id,
                subscription_id: 0,
                name,
            })
            await expect(promise).rejects.toThrowError(RequestError)
        })
    })

    describe('sendCampaign', () => {
        test('enqueue an email job', async () => {

            const campaign = await createTestCampaign()
            const user = await createUser(campaign.project_id)

            const spy = jest.spyOn(App.main.queue, 'enqueue')
            await sendCampaign(campaign, user)

            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0][0]).toBeInstanceOf(EmailJob)
        })
    })

    describe('sendList', () => {
        test('enqueue sends for a list of people', async () => {
            const spy = jest.spyOn(CampaignService, 'sendCampaign')

            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                rules: [],
            })
            const campaign = await createTestCampaign(params, {
                list_id: list.id,
            })

            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list)
            }

            await sendList(campaign)

            const updatedCampaign = await Campaign.find(campaign.id)

            expect(spy).toHaveBeenCalledTimes(20)
            expect(spy.mock.calls[0][0].id).toEqual(campaign.id)
            expect(updatedCampaign?.state).toEqual('finished')
            expect(updatedCampaign?.delivery.sent).toEqual(20)
        })

        test('users outside of list arent sent the campaign', async () => {
            const spy = jest.spyOn(CampaignService, 'sendCampaign')

            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                rules: [],
            })
            const list2 = await createList(params.project_id, {
                name: uuid(),
                rules: [],
            })
            const campaign = await createTestCampaign(params, {
                list_id: list.id,
            })

            const inclusiveIds = []
            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list)
                inclusiveIds.push(user.id)
            }

            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list2)
            }

            await sendList(campaign)

            expect(spy).toHaveBeenCalledTimes(20)
            expect(spy.mock.calls[0][0].id).toEqual(campaign.id)
            expect(spy.mock.calls[0][1]).toEqual(inclusiveIds[0])
        })
    })
})
