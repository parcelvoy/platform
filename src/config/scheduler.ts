import schedule from 'node-schedule'
import App from '../app'
import JourneyDelayJob from '../journey/JourneyDelayJob'

export default async (app: App) => {
    schedule.scheduleJob('* * * * *', function() {
        app.queue.enqueue(JourneyDelayJob.from())
    })
    return schedule
}
