import env from '../src/config/env'
import App from '../src/app'

beforeAll(async () => {
    await App.init(env('test'))
})
