import { useSearchParams } from 'react-router-dom'
import { ReactComponent as Logo } from '../../assets/logo.svg'
import { env } from '../../config/env'
import Button from '../../ui/Button'
import './Auth.css'

export default function Login() {
    const [searchParams] = useSearchParams()

    const handleRedirect = () => {
        window.location.href = `${env.api.baseURL}/auth/login?r=${searchParams.get('r') ?? '/'}`
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
