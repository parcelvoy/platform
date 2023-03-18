import App from '../app'

interface JobOptions {
    delay?: number
}

export interface EncodedJob {
    data: any
    options: JobOptions
    name: string
}

export default class Job implements EncodedJob {
    data: any
    options: JobOptions = { delay: 0 }

    static $name: string = Job.constructor.name

    get name() {
        return this.$static.$name
    }

    get $static() {
        return this.constructor as typeof Job
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async handler(_: any): Promise<any> {
        return Promise.reject(new Error('Handler not defined.'))
    }

    static from(...args: any[]): Job {
        return new this({ ...args })
    }

    async queue() {
        return App.main.queue.enqueue(this)
    }

    constructor(data: any) {
        this.data = data
    }

    toJSON() {
        return {
            name: this.name,
            data: this.data,
            options: this.options,
        }
    }
}
