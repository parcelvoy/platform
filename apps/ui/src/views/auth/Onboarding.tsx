import { Outlet } from 'react-router-dom'
import './Auth.css'
import { ReactComponent as Logo } from '../../assets/logo.svg'

export default function Onboarding() {
    return (
        <div className="auth onboarding">
            <div className="logo">
                <Logo />
            </div>
            <Outlet />
        </div>
    )
}
