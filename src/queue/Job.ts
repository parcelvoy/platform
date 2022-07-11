interface JobOptions {
    delay?: number
}

export interface EncodedJob {
    data: any
    options: JobOptions
    name: string
}

export default class Job implements EncodedJob {
    
    static $name: string = Job.constructor.name

    data: any
    options: JobOptions = {
        delay: 0
    }

    get name() {
        return this.$static.$name
    }
    get $static() {
        return this.constructor as typeof Job
    }

    static async handler(_: any): Promise<any> { 
        return Promise.reject()
    }

    static from(...args: any[]): Job {
        return new this({ ...args })
    }

    constructor(data: any) {
        this['data'] = data
    }

    toJSON() {
        return {
            name: this.name,
            data: this.data,
            options: this.options
        }
    }
}