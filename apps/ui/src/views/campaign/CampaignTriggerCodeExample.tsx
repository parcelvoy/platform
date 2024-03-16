import { toast } from 'react-hot-toast/headless'
import { env } from '../../config/env'
import { Campaign } from '../../types'
import { CopyIcon } from '../../ui/icons'
import Button from '../../ui/Button'
import './CampaignTriggerCodeExample.css'

function CampaignTriggerCodeExample({ campaign }: { campaign: Campaign }) {

    const handleCopy = async (value: string) => {
        await navigator.clipboard.writeText(value)
        console.log('copied')
        toast.success('Copied code sample')
    }

    const extra = campaign.channel === 'text'
        ? '"phone": "+12345678900",'
        : campaign.channel === 'push'
            ? '"device_token": "DEVICE_TOKEN",'
            : '"email": "email@testing.com",'

    const code = `curl --request POST \\
    --url '${env.api.baseURL}/admin/campaigns/${campaign.id}/trigger' \\
    --header 'Authorization: Bearer API_KEY' \\
    --header 'Content-Type: application/json' \\
    --data '{
    "user": {
        "external_id": "2391992",
        ${extra}
        "extraUserProperty": true
    },
    "event": {
        "purchaseAmount": 29.99
    }
}'`

    return (
        <div className="campaign-code-example">
            <pre>
                <code>
                    {code}
                </code>
            </pre>
            <div className="copy-button">
                <Button
                    icon={<CopyIcon />}
                    variant="secondary"
                    size="small"
                    onClick={async () => await handleCopy(code)}
                />
            </div>
        </div>
    )
}
export default CampaignTriggerCodeExample
