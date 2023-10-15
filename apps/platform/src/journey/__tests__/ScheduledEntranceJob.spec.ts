import Project from '../../projects/Project'
import Journey from '../Journey'
import { JourneyEntrance, JourneyUserStep } from '../JourneyStep'
import { Frequency, RRule } from 'rrule'
import { addDays } from 'date-fns'
import List, { UserList } from '../../lists/List'
import { User } from '../../users/User'
import ScheduledEntranceJob from '../ScheduledEntranceJob'

describe('ScheduledEntranceJob', () => {

    test('enters all users from list into journey', async () => {

        const project = await Project.insertAndFetch({
            name: 'scheduler test ' + Date.now(),
        })

        const list_id = await List.insert({
            project_id: project.id,
            name: 'scheduler list',
            type: 'static',
        })

        const userIds = await Promise.all(Array.from({ length: 3 }).map((_, i) => User.insert({
            project_id: project.id,
            external_id: `u${i}`,
        })))

        await UserList.insert(userIds.map(user_id => ({ user_id, list_id })))

        const now = new Date()

        const { journey, steps } = await Journey.create(project.id, 'scheduler test', {
            e: {
                x: 0,
                y: 0,
                type: JourneyEntrance.type,
                data: {
                    trigger: 'schedule',
                    list_id,
                    schedule: new RRule({
                        dtstart: addDays(now, -1),
                        freq: Frequency.DAILY,
                        interval: 1,
                    }).toString(),
                },
            },
        })

        const e = steps.find(s => s.external_id === 'e')!

        await ScheduledEntranceJob.handler({ entranceId: e.id })

        const count = await JourneyUserStep.count(q => q.where('journey_id', journey.id))

        expect(count).toBe(3) // now users 1-3 should be added

    })

})
