import * as React from 'react'
import { Toast, ToastPosition, resolveValue } from 'react-hot-toast/headless'
import { ToastIcon } from './ToastIcon'
import clsx from 'clsx'

interface ToastBarProps {
    toast: Toast
    position?: ToastPosition
    style?: React.CSSProperties
}

const getAnimationStyle = (visible: boolean): React.CSSProperties => {
    return {
        animation: visible
            ? 'toastBarEnter 0.35s cubic-bezier(.21,1.02,.73,1) forwards'
            : 'toastBarExit 0.4s forwards cubic-bezier(.06,.71,.55,1)',
    }
}

export default function ToastBar({ toast, style }: ToastBarProps) {
    const animationStyle: React.CSSProperties = toast.height
        ? getAnimationStyle(toast.visible)
        : { opacity: 0 }

    const icon = <ToastIcon toast={toast} />
    const message = (
        <div {...toast.ariaProps} className="toast-message">
            {resolveValue(toast.message, toast)}
        </div>
    )

    return (
        <div
            className={clsx(toast.className, 'ui-toast-bar')}
            style={{
                ...animationStyle,
                ...style,
                ...toast.style,
            }}
        >
            {icon}
            {message}
        </div>
    )
}
