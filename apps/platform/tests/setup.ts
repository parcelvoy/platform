import env from '../src/config/env'
import App from '../src/app'

jest.mock('../src/config/redis')

beforeAll(async () => {
    await App.init(env('test'))
})
