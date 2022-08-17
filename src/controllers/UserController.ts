/* eslint-disable */

import Router from '@koa/router'
import App from '../app'
import { User } from '../models/User'
import EmailJob from '../sender/email/EmailJob'

const router = new Router({
    prefix: '/users'
})

const user = new User({
    id: 1,
    project_id: 1,
    external_id: "1",
    email: 'canderson@twochris.com',
    data: {
        firstName: 'Chris',
        lastName: 'Anderson',
        city: 'Chicago'
    },
    devices: [],
    attributes: [],
    created_at: new Date(),
    updated_at: new Date()
})

router.get('/', async (ctx, next) => {
    const email = {
        from: 'hi@chrisanderson.io',
        to: 'chrisanderson93@gmail.com',
        subject: 'Hello there {{user.firstName}}!',
        html: 'This is a test to see how sending a template would work.\n\nFirst Name: {{user.firstName}}\nLast Name: {{user.lastName}}\nEmail: {{user.email}} {{reverse user.email}} {{multiply (add 1 1) 10}}\n\n<br>{{numberFormat 100000}}',
        text: 'This is the text version seen in {{user.city}}'
    }

    const job = EmailJob.from({
        email,
        user,
        event: {}
    })
    await App.main.queue.enqueue(job)

    ctx.body = 'sent email!'
})

router.get('/text', async (ctx, next) => {
    await App.main.texter.send(
        {
            to: '952-769-6903',
            from: '123-456-7890',
            text: 'You have won a fabulous prize {{ user.firstName }}!'
        },
        {
            user
        }
    )

    ctx.body = 'sent text!'
})

router.get('/webhook', async (ctx, next) => {
    await App.main.webhooker.send(
        {
            method: 'POST',
            endpoint: 'twochris.com/status',
            headers: { },
            body: {
                foo: 'bar {{ user.email }}'
            }
        },
        {
            user
        }
    )

    ctx.body = 'sent webhook!'
})

export default router