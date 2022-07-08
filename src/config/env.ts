import * as dotenv from 'dotenv'
dotenv.config()

interface Env {

}

const env = {
    db: {
        host: process.env.DB_HOST!,
        username: process.env.DB_USERNAME!,
        password: process.env.DB_PASSWORD!,
        port: process.env.DB_PORT!
    }
}

// Check to ensure ENV exists

export default env