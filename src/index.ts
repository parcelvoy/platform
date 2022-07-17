import App from './app'
import env from './config/env'

App.init(env)
    .then(app => app.listen())
