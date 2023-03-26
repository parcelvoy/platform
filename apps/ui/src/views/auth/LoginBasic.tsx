import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api'
import { ReactComponent as Logo } from '../../assets/logo.svg'
import Alert from '../../ui/Alert'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import './Auth.css'

interface LoginBasicParams {
    email: string
    password: string
}

export default function Login() {
    const [searchParams] = useSearchParams()
    const [error, setError] = useState<string | undefined>()

    const handleLogin = async ({ email, password }: LoginBasicParams) => {
        try {
            await api.basicAuth(email, password, searchParams.get('r') ?? '/')
        } catch (error: any) {
            if (error?.response?.data) {
                setError(error.response.data.error)
            }
        }
    }

    return (
        <div className="auth login">
            <div className="logo">
                <Logo />
            </div>
            <div className="auth-step">
                <h1>Login</h1>
                {error && (
                    <Alert variant="error" title="Error">{error}</Alert>
                )}
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
