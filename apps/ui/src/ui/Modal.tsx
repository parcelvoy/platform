import { Dialog, Transition } from '@headlessui/react'
import { Fragment, PropsWithChildren, ReactNode } from 'react'
import './Modal.css'

export interface ModalProps {
    open: boolean
    onClose: (open: boolean) => void
    title: ReactNode
    actions?: ReactNode
    size?: 'small' | 'regular' | 'large'
}

export default function Modal({
    children,
    open,
    onClose,
    title,
    actions,
    size,
}: PropsWithChildren<ModalProps>) {
    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className={`modal ${size ?? 'small'}`} onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-enter"
                    enterFrom="transition-enter-from"
                    enterTo="transition-enter-to"
                    leave="transition-leave"
                    leaveFrom="transition-leave-from"
                    leaveTo="transition-leave-to"
                >
                    <div className="modal-overlay" />
                </Transition.Child>
                <div className="modal-wrapper">
                    <Transition.Child
                        as={Fragment}
                        enter="transition-enter"
                        enterFrom="transition-enter-from transition-enter-from-scale"
                        enterTo="transition-enter-to"
                        leave="transition-leave"
                        leaveFrom="transition-leave-from"
                        leaveTo="transition-leave-to"
                    >
                        <Dialog.Panel className="modal-inner">
                            <div className="modal-header">
                                <Dialog.Title as="h3">{title}</Dialog.Title>
                            </div>
                            {children}
                            {actions && <div className="modal-footer">
                                {actions}
                            </div>}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
