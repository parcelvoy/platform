import App from './app'
import env from './config/env'


App.init(env).listen();

// Migrate

// Validating settings
// Connect to database
const app = App.init(env)
app.listen()

api(app)
worker(app)

// Starting the API

// Starting job queue

// 