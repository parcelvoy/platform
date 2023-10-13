import Admin from '../../auth/Admin'
import { createProject } from '../../projects/ProjectService'
import { createUser } from '../../users/UserRepository'
import { uuid } from '../../utilities'
import { clickWrapHtml, encodedLinkToParts, openWrapHtml, paramsToEncodedLink, preheaderWrapHtml } from '../LinkService'

describe('LinkService', () => {
    describe('encodedLinkToParts', () => {
        test('a properly encoded link decodes to parts', async () => {
            const admin = await Admin.insertAndFetch({
                first_name: uuid(),
                last_name: uuid(),
                email: `${uuid()}@test.com`,
            })
            const project = await createProject(admin, {
                name: uuid(),
                timezone: 'utc',
                locale: 'en',
            })
            const user = await createUser(project.id, {
                anonymous_id: uuid(),
                external_id: uuid(),
            })

            const redirect = 'http://test.com'
            const link = paramsToEncodedLink({
                userId: user.id,
                campaignId: 1,
                path: 'c',
                redirect,
            })

            const parts = await encodedLinkToParts(link)
            expect(parts.user?.id).toEqual(user.id)
            expect(parts.redirect).toEqual(redirect)
        })
    })

    describe('clickWrapHtml', () => {
        test('links are wrapped', async () => {
            const html = 'This is some html <a href="https://test.com">Test Link</a>'
            const output = clickWrapHtml(html, { userId: 1, campaignId: 2 })
            expect(output).toMatchSnapshot()
        })
    })

    describe('openWrapHtml', () => {
        test('open tracking image is added to end of body', async () => {
            const html = '<html><body>This is some html</body></html>'
            const output = openWrapHtml(html, { userId: 3, campaignId: 4 })
            expect(output).toMatchSnapshot()
        })
    })

    describe('preheaderWrapHtml', () => {
        test('simple html injects preheader', async () => {
            const preheader = 'This is some preheader'
            const html = '<html><body>This is some html</body></html>'
            const output = preheaderWrapHtml(html, preheader)
            expect(output).toMatchSnapshot()
        })

        test('complex html injects preheader', async () => {
            const preheader = 'This is some preheader'
            const html = `<html>
                <body
                    style="color:#000"
                    class="body-class">
                    This is some html
                </body>
            </html>`
            const output = preheaderWrapHtml(html, preheader)
            expect(output).toMatchSnapshot()
        })
    })
})
