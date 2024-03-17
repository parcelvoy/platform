import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import reportWebVitals from './reportWebVitals'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import './variables.css'
import './index.css'

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
)
root.render(
    <StrictMode>
        <App />
    </StrictMode>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
