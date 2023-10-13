import Admin from '../../../auth/Admin'
import { createProject } from '../../../projects/ProjectService'
import { Variables } from '../../../render'
import { TextTemplate } from '../../../render/Template'
import { UserEvent } from '../../../users/UserEvent'
import { createUser } from '../../../users/UserRepository'
import { uuid } from '../../../utilities'
import LoggerTextProvider from '../LoggerTextProvider'
import TextChannel from '../TextChannel'

describe('TextChannel', () => {

    const optOut = 'Reply STOP to opt out.'
    const setup = async (text_opt_out_message?: string): Promise<{ variables: Variables, template: TextTemplate }> => {
        const text = 'Hello world!'
        const admin = await Admin.insertAndFetch({
            first_name: uuid(),
            last_name: uuid(),
            email: `${uuid()}@test.com`,
        })
        const project = await createProject(admin, {
            name: uuid(),
            timezone: 'utc',
            text_opt_out_message,
            locale: 'en',
        })
        const user = await createUser(project.id, {
            anonymous_id: uuid(),
            external_id: uuid(),
        })
        const template = new TextTemplate()
        template.text = text

        return {
            variables: {
                user,
                context: {
                    template_id: 1,
                    campaign_id: 1,
                    subscription_id: 1,
                },
                project,
            },
            template,
        }
    }

    describe('build', () => {
        test('a first message will get opt out', async () => {
            const { variables, template } = await setup(optOut)
            const channel = new TextChannel(new LoggerTextProvider())

            const message = await channel.build(template, variables)

            expect(message.text).toContain(optOut)
        })

        test('a second message has no opt out', async () => {
            const { variables, template } = await setup(optOut)
            const channel = new TextChannel(new LoggerTextProvider())

            await UserEvent.insert({
                user_id: variables.user.id,
                name: 'text_sent',
                project_id: variables.project.id,
            })

            const message = await channel.build(template, variables)

            expect(message.text).not.toContain(optOut)
        })

        test('no opt out template means no opt out appended', async () => {
            const { variables, template } = await setup()
            const channel = new TextChannel(new LoggerTextProvider())

            const message = await channel.build(template, variables)

            expect(message.text).not.toContain(optOut)
        })
    })
})
