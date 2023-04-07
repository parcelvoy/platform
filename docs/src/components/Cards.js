import React from 'react'
import './Card.css'

export default function Cards({ children }) {
    return (
        <div className="cards">
            {children}
        </div>
    )
}