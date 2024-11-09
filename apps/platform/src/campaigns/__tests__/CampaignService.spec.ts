import { RequestError } from '../../core/errors'
import { addUserToList, createList } from '../../lists/ListService'
import { createSubscription, subscribe, subscribeAll } from '../../subscriptions/SubscriptionService'
import { User } from '../../users/User'
import { uuid } from '../../utilities'
import Campaign, { CampaignSend, SentCampaign } from '../Campaign'
import { allCampaigns, createCampaign, getCampaign, generateSendList, estimatedSendSize, updateCampaignSendEnrollment } from '../CampaignService'
import { createProvider } from '../../providers/ProviderRepository'
import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'
import ListStatsJob from '../../lists/ListStatsJob'

afterEach(() => {
    jest.clearAllMocks()
})

describe('CampaignService', () => {

    interface CampaignRefs {
        project_id: number
        provider_id: number
        subscription_id: number
    }

    const createCampaignDependencies = async (): Promise<CampaignRefs> => {
        const project = await createTestProject()
        const subscription = await createSubscription(project.id, {
            name: uuid(),
            channel: 'email',
        })
        const provider = await createProvider(project.id, {
            type: 'smtp',
            group: 'email',
            data: {},
            name: uuid(),
            is_default: false,
            rate_limit: 10,
            rate_interval: 'second',
        })
        return {
            project_id: project.id,
            provider_id: provider.id,
            subscription_id: subscription.id,
        }
    }

    const createTestCampaign = async (params?: CampaignRefs, extras?: Partial<Campaign>) => {
        params = params || await createCampaignDependencies()

        const campaign = await createCampaign(params.project_id, {
            name: uuid(),
            type: 'blast',
            channel: 'email',
            ...params,
            ...extras,
        })

        return campaign
    }

    const createUser = async (project_id: number): Promise<User> => {
        return await User.insertAndFetch({
            project_id,
            external_id: uuid(),
            email: `${uuid()}@test.com`,
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
            expect(campaigns[0].provider_id).toEqual(params.provider_id)
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
            expect(campaigns[0].provider_id).toEqual(params1.provider_id)
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
                channel: 'email',
                type: 'blast',
                name,
            })

            expect(campaign.name).toEqual(name)
            expect(campaign.subscription_id).toEqual(params.subscription_id)
            expect(campaign.project_id).toEqual(params.project_id)
            expect(campaign.provider_id).toEqual(params.provider_id)
        })

        test('fail to create a campaign with a bad subscription', async () => {
            const params = await createCampaignDependencies()
            const name = uuid()
            const promise = createCampaign(params.project_id, {
                channel: 'email',
                type: 'blast',
                subscription_id: 0,
                provider_id: params.provider_id,
                name,
            })
            await expect(promise).rejects.toThrowError(RequestError)
        })
    })

    describe('sendList', () => {
        test('enqueue sends for a list of people', async () => {
            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const campaign = await createTestCampaign(params, {
                list_ids: [list.id],
                send_at: new Date(),
            }) as SentCampaign

            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list)
                await subscribe(user.id, params.subscription_id)
            }

            await generateSendList(campaign)

            const sends = await CampaignSend.all(qb => qb.where('campaign_id', campaign.id))

            const updatedCampaign = await Campaign.find(campaign.id)

            expect(sends.length).toEqual(20)
            expect(updatedCampaign?.state).toEqual('scheduled')
        })

        test('users outside of list arent sent the campaign', async () => {

            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const list2 = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const campaign = await createTestCampaign(params, {
                list_ids: [list.id],
                send_at: new Date(),
            }) as SentCampaign

            const inclusiveIds: number[] = []
            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list)
                await subscribe(user.id, params.subscription_id)
                inclusiveIds.push(user.id)
            }

            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list2)
                await subscribe(user.id, params.subscription_id)
            }

            await generateSendList(campaign)

            const sends = await CampaignSend.all(qb => qb.where('campaign_id', campaign.id))
            const updatedCampaign = await Campaign.find(campaign.id)

            expect(sends.length).toEqual(20)
            expect(updatedCampaign?.state).toEqual('scheduled')
        })
    })

    describe('estimatedSendSize', () => {

        test('send size is equal to combination of all lists', async () => {
            const params = await createCampaignDependencies()
            const list1 = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const list2 = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })

            const campaign = await createTestCampaign(params, {
                list_ids: [list1.id, list2.id],
                send_at: new Date(),
            }) as SentCampaign

            for (let i = 0; i < 20; i++) {
                const user = await createUser(params.project_id)
                await addUserToList(user, list1)
                await addUserToList(user, list2)
                await subscribe(user.id, params.subscription_id)
            }

            await ListStatsJob.handler({ listId: list1.id, projectId: params.project_id })
            await ListStatsJob.handler({ listId: list2.id, projectId: params.project_id })

            const sendSize = await estimatedSendSize(campaign)
            expect(sendSize).toEqual(40)
        })
    })

    describe('updateCampaignSendEnrollment', () => {
        test('join a user to a scheduled campaign', async () => {
            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const campaign = await createTestCampaign(params, {
                list_ids: [list.id],
            }) as SentCampaign
            await Campaign.updateAndFetch(campaign.id, { state: 'scheduled' })

            const user = await createUser(campaign.project_id)
            await subscribeAll(user)
            await addUserToList(user, list)

            await updateCampaignSendEnrollment(user)

            const updated = await CampaignSend.first(qb => qb.where('campaign_id', campaign.id).where('user_id', user.id))

            expect(updated).not.toBeUndefined()
        })

        test('do not join a user to a draft campaign', async () => {
            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const campaign = await createTestCampaign(params, {
                list_ids: [list.id],
            }) as SentCampaign

            const user = await createUser(campaign.project_id)
            await subscribeAll(user)
            await addUserToList(user, list)

            await updateCampaignSendEnrollment(user)

            const updated = await CampaignSend.first(qb => qb.where('campaign_id', campaign.id).where('user_id', user.id))

            expect(updated).toBeUndefined()
        })

        test('remove a user who no longer matches list', async () => {
            const params = await createCampaignDependencies()
            const list = await createList(params.project_id, {
                name: uuid(),
                type: 'static',
                is_visible: true,
            })
            const campaign = await createTestCampaign(params, {
                list_ids: [list.id],
            }) as SentCampaign
            await Campaign.updateAndFetch(campaign.id, { state: 'scheduled' })

            const user = await createUser(campaign.project_id)
            await subscribeAll(user)

            await CampaignSend.insert({ campaign_id: campaign.id, user_id: user.id, state: 'pending' })

            await updateCampaignSendEnrollment(user)

            const updated = await CampaignSend.first(qb => qb.where('campaign_id', campaign.id).where('user_id', user.id))

            expect(updated).toBeUndefined()
        })
    })
})
