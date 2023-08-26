import env from '../src/config/env'
import App from '../src/app'

jest.mock('ioredis', () => require('ioredis-mock'))

beforeAll(async () => {
    await App.init(env('test'))
})
