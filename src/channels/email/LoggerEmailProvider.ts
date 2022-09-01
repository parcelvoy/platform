import { logger } from '../../config/logger'
import { Email } from './Email'
import EmailProvider from './EmailProvider'

export default class LoggerEmailProvider extends EmailProvider {
    host!: string
    port!: number
    secure!: boolean
    auth!: { user: string, pass: string }

    async send(message: Email): Promise<any> {
        logger.info(message)
    }

    async verify(): Promise<boolean> {
        return true
    }
}
