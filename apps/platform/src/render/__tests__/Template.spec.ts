import { Variables } from '..'
import Project from '../../projects/Project'
import { User } from '../../users/User'
import { EmailTemplate, PushTemplate } from '../Template'

describe('Template', () => {
    describe('compile email', () => {
        test('link wrap enabled', async () => {
            const url = 'https://google.com'
            const template = EmailTemplate.fromJson({
                type: 'email',
                data: {
                    from: 'from',
                    subject: 'subject',
                    html: `<html><body><a href="${url}">link</a></body></html>`,
                },
            })
            const variables: Variables = {
                project: Project.fromJson({
                    link_wrap_email: true,
                }),
                user: User.fromJson({ id: 1 }),
                context: {
                    template_id: 1,
                    campaign_id: 1,
                    reference_id: '1',
                    subscription_id: 1,
                    reference_type: 'type',
                },
            }
            const compiled = template.compile(variables)
            expect(compiled).toMatchSnapshot()
        })

        test('link wrap disabled', async () => {
            const url = 'https://google.com'
            const template = EmailTemplate.fromJson({
                type: 'email',
                data: {
                    from: 'from',
                    subject: 'subject',
                    html: `<html><body><a href="${url}">link</a></body></html>`,
                },
            })
            const variables: Variables = {
                project: Project.fromJson({
                    link_wrap_email: false,
                }),
                user: User.fromJson({ id: 1 }),
                context: {
                    template_id: 1,
                    campaign_id: 1,
                    reference_id: '1',
                    subscription_id: 1,
                    reference_type: 'type',
                },
            }
            const compiled = template.compile(variables)
            expect(compiled).toMatchSnapshot()
        })
    })

    describe('compile push', () => {
        test('link wrap disabled', async () => {
            const url = 'https://google.com'
            const template = PushTemplate.fromJson({
                type: 'push',
                data: {
                    title: 'title',
                    topic: 'topic',
                    body: 'body',
                    url,
                    custom: {
                        key: 'value',
                    },
                },
            })
            const variables: Variables = {
                project: Project.fromJson({
                    link_wrap_push: false,
                }),
                user: User.fromJson({ id: 1 }),
                context: {
                    template_id: 1,
                    campaign_id: 1,
                    reference_id: '1',
                    subscription_id: 1,
                    reference_type: 'type',
                },
            }
            const compiled = template.compile(variables)
            expect(compiled).toMatchSnapshot()
            expect(compiled.custom.url).toBe(url)
        })

        test('link wrap enabled', async () => {
            const url = 'https://google.com'
            const template = PushTemplate.fromJson({
                type: 'push',
                data: {
                    title: 'title',
                    topic: 'topic',
                    body: 'body',
                    url,
                    custom: {
                        key: 'value',
                    },
                },
            })
            const variables: Variables = {
                project: Project.fromJson({
                    link_wrap_push: true,
                }),
                user: User.fromJson({ id: 1 }),
                context: {
                    template_id: 1,
                    campaign_id: 1,
                    reference_id: '1',
                    subscription_id: 1,
                    reference_type: 'type',
                },
            }
            const compiled = template.compile(variables)
            expect(compiled).toMatchSnapshot()
            expect(compiled.custom.url).not.toBe(url)
        })
    })
})
