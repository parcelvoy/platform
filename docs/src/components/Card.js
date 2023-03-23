import React from 'react'
import './Card.css'

export default function Card({ image, title, href, children }) {
    return (
        <a href={href} className="card">
            <img src={image} />
            <div className="card-content">
                <h3 style={{ margin: '0 0 5px 0', padding: '0' }}>{title}</h3>
                <div>{children}</div>
            </div>
        </a>
    )
}