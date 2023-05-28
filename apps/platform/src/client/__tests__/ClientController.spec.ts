import supertest from 'supertest'
import Api from '../../api'
import App from '../../app'
import { createProjectApiKey } from '../../projects/ProjectService'
import { uuid } from '../../utilities'
import UserAliasJob from '../../users/UserAliasJob'
import UserPatchJob from '../../users/UserPatchJob'
import UserDeviceJob from '../../users/UserDeviceJob'
import EventPostJob from '../EventPostJob'
import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'

afterEach(() => {
    jest.clearAllMocks()
})

const setup = async () => {
    const api = new Api(App.main)

    const project = await createTestProject()
    const apiKey = await createProjectApiKey(project.id, {
        scope: 'public',
        name: uuid(),
        role: 'support',
    })
    return (method, path) => supertest(api.callback())[method](path)
        .set('Authorization', `Bearer ${apiKey.value}`)
}

describe('POST /alias', () => {
    test('queues up alias request', async () => {

        const request = await setup()
        const spy = jest.spyOn(App.main.queue, 'enqueue')
        const response = await request('post', '/api/client/alias')
            .send({
                external_id: uuid(),
                anonymous_id: uuid(),
            })
        expect(response.status).toBe(204)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy.mock.calls[0][0]).toBeInstanceOf(UserAliasJob)
    })
})

describe('POST /identify', () => {
    test('queues up identify', async () => {

        const request = await setup()
        const spy = jest.spyOn(App.main.queue, 'enqueue')
        const response = await request('post', '/api/client/identify')
            .send({
                external_id: uuid(),
                anonymous_id: uuid(),
                email: `${uuid()}@test.com}`,
                data: {
                    number: 1,
                },
            })
        expect(response.status).toBe(204)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy.mock.calls[0][0]).toBeInstanceOf(UserPatchJob)
    })
})

describe('POST /devices', () => {
    test('queues up devices', async () => {

        const request = await setup()
        const spy = jest.spyOn(App.main.queue, 'enqueue')
        const response = await request('post', '/api/client/devices')
            .send({
                external_id: uuid(),
                anonymous_id: uuid(),
                device_id: uuid(),
                token: uuid(),
                os: 'ios',
                model: 'iPhone',
                app_build: '1',
                app_version: '1.0.0',
            })
        expect(response.status).toBe(204)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy.mock.calls[0][0]).toBeInstanceOf(UserDeviceJob)
    })
})

describe('POST /events', () => {
    test('queues up events', async () => {

        const request = await setup()
        const spy = jest.spyOn(App.main.queue, 'enqueue')
        const response = await request('post', '/api/client/events')
            .send([{
                name: 'Entered',
                external_id: uuid(),
                anonymous_id: uuid(),
                data: {
                    value: 1,
                },
            }, {
                name: 'Exited',
                external_id: uuid(),
                anonymous_id: uuid(),
                data: {
                    value: 1,
                },
            }])
        expect(response.status).toBe(204)
        expect(spy).toHaveBeenCalledTimes(2)
        expect(spy.mock.calls[0][0]).toBeInstanceOf(EventPostJob)
    })
})
