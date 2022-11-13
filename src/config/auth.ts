
import Auth, { AuthConfig } from '../auth/Auth'

export default (config: AuthConfig) => {
    return new Auth(config)
}
