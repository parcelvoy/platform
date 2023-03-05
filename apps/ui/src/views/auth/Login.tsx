import { ReactComponent as Logo } from '../../assets/logo.svg'
import { env } from '../../config/env'
import Button from '../../ui/Button'
import './Auth.css'

export default function Login() {

    const handleRedirect = () => {
        const urlParams = new URLSearchParams(window.location.search)
        window.location.href = `${env.api.baseURL}/auth/login?r=${urlParams.get('r')}`
    }

    return (
        <div className="auth login">
            <div className="logo">
                <Logo />
            </div>
            <div className="auth-step">
                <h1>Welcome!</h1>
                <p>Please use the button below to authenticate.</p>
                <Button onClick={handleRedirect}>Login</Button>
            </div>
        </div>
    )
}
