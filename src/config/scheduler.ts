import schedule from 'node-schedule'
import App from '../app'
import CampaignTriggerJob from '../campaigns/CampaignTriggerJob'
import JourneyDelayJob from '../journey/JourneyDelayJob'

export default async (app: App) => {
    schedule.scheduleJob('* * * * *', function() {
        app.queue.enqueue(JourneyDelayJob.from())
        app.queue.enqueue(CampaignTriggerJob.from())
    })
    return schedule
}
