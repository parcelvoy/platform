import React from 'react'

export default function Cards({ children }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
            }}>
            {children}
        </div>
    )
}