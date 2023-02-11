import { PropsWithChildren } from 'react'
import './ButtonGroup.css'

export default function ButtonGroup({ children }: PropsWithChildren) {
    return (
        <div className="ui-button-group">
            {children}
        </div>
    )
}
