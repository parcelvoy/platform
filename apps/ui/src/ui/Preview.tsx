import { format } from 'date-fns'
import { Template } from '../types'
import Iframe from './Iframe'
import './Preview.css'
import { ReactNode, useContext } from 'react'
import { ProjectContext } from '../contexts'
import JsonPreview from './JsonPreview'

interface PreviewProps {
    template: Pick<Template, 'type' | 'data'>
}

export default function Preview({ template }: PreviewProps) {
    const [project] = useContext(ProjectContext)
    const { data, type } = template

    let preview: ReactNode = null
    if (type === 'email') {
        preview = (
            <div className="email-frame">
                {
                    data.from?.address && (
                        <div className="email-frame-header">
                            <span className="email-from">{data.from?.name} &lt;{data.from?.address}&gt;</span>
                            <span className="email-subject">{data.subject}</span>
                        </div>
                    )
                }
                <Iframe content={data.html ?? ''} />
            </div>
        )
    } else if (type === 'text') {
        preview = (
            <div className="text-frame phone-frame">
                <div className="text-frame-header">
                    <div className="text-frame-profile-image">
                        <i className="bi bi-person-fill" />
                    </div>
                </div>
                <span className="text-frame-context">Text Message<br/>Today { format(new Date(), 'p') }</span>
                <div className="text-bubble">{data.text}<br />{project.text_opt_out_message}</div>
            </div>
        )
    } else if (type === 'push') {
        preview = (
            <div className="push-frame phone-frame">
                <div className="push-notification">
                    <div className="notification-icon"></div>
                    <div className="notification-header">
                        <span className="notification-title">{data.title}</span>
                        <span className="notification-time">now</span>
                    </div>
                    <span className="notification-body">{data.body}</span>
                </div>
            </div>
        )
    } else if (type === 'webhook') {
        preview = (
            <div className="webhook-frame">
                <JsonPreview value={data} />
            </div>
        )
    } else if (type === 'in_app') {
        preview = (
            <Iframe content={data.html ?? ''} />
        )
    }

    return (
        <section className="preview">
            {preview}
        </section>
    )
}
