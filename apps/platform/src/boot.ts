import App from './app'
import env from './config/env'

export default App.init(env())
    .then(app => app.start())
    .catch(error => console.error(error))
