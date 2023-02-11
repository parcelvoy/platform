import { PropsWithChildren, ReactNode } from 'react'
import Button from './Button'
import Modal from './Modal'

export interface DialogProps {
    open: boolean
    onClose: (isOpen: boolean) => void
    title: ReactNode
    actions?: ReactNode
}

export default function Dialog({ children, open, onClose, title, actions }: PropsWithChildren<DialogProps>) {
    return <Modal
        open={open}
        onClose={() => onClose(false)}
        title={title}
        actions={actions ?? <Button onClick={() => onClose(false)}>Close</Button>}
        size="small">
        {children}
    </Modal>
}
