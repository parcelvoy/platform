import { useSearchParams } from 'react-router-dom'
import api from '../../api'
import { ReactComponent as Logo } from '../../assets/logo.svg'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import './Auth.css'

interface LoginBasicParams {
    email: string
    password: string
}

export default function Login() {
    const [searchParams] = useSearchParams()

    const handleLogin = async ({ email, password }: LoginBasicParams) => {
        await api.basicAuth(email, password, searchParams.get('r') ?? '/')
    }

    return (
        <div className="auth login">
            <div className="logo">
                <Logo />
            </div>
            <div className="auth-step">
                <h1>Login</h1>
                <FormWrapper<LoginBasicParams>
                    onSubmit={handleLogin}>
                    {form => <>
                        <TextInput.Field form={form} name="email" />
                        <TextInput.Field form={form} name="password" type="password" />
                    </>}
                </FormWrapper>
            </div>
        </div>
    )
}
