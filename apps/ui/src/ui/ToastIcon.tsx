import * as React from 'react'
import { Toast } from 'react-hot-toast/headless'

export const ToastIcon: React.FC<{
    toast: Toast
}> = ({ toast }) => {
    const { icon, type } = toast
    if (icon !== undefined) {
        if (typeof icon === 'string') {
            return <div className="icon-wrapper">{icon}</div>
        } else {
            return icon
        }
    }

    if (type === 'blank') {
        return null
    }

    return (
        <div className="indicator-wrapper">
            <div className="loader-icon" />
            {type !== 'loading' && (
                <div className="status-wrapper">
                    {type === 'error'
                        ? <div className="error-icon" />
                        : <div className="checkmark-icon" />
                    }
                </div>
            )}
        </div>
    )
}
