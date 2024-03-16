import { useSearchParams } from 'react-router-dom'
import { ReactComponent as Logo } from '../../assets/logo.svg'
import { env } from '../../config/env'
import Button from '../../ui/Button'
import './Auth.css'
import { useEffect, useState } from 'react'
import api from '../../api'
import { AuthMethod } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { Alert } from '../../ui'

interface LoginParams {
    email: string
    password?: string
}

export default function Login() {
    const [searchParams] = useSearchParams()
    const [methods, setMethods] = useState<AuthMethod[]>()
    const [method, setMethod] = useState<AuthMethod>()
    const [message, setMessage] = useState<string>()

    const handleRedirect = (driver: string, email?: string) => {
        window.location.href = `${env.api.baseURL}/auth/login/${driver}?r=${searchParams.get('r') ?? '/'}&email=${email}`
    }

    const handleMethod = (method: AuthMethod) => {
        if (['multi', 'basic', 'email'].includes(method.driver)) {
            setMethod(method)
        } else {
            handleRedirect(method.driver)
        }
    }

    const handleLogin = (method: string) => {
        return async ({ email, password }: LoginParams) => {
            if (password && method === 'basic') {
                await api.auth.basicAuth(email, password, searchParams.get('r') ?? '/')
            } else if (method === 'email') {
                await api.auth.emailAuth(email, searchParams.get('r') ?? '/')
                setMessage('An email has been sent to the address you indicated with a link to continue.')
            } else {
                await checkEmail(method, email)
                handleRedirect(method, email)
            }
        }
    }

    const checkEmail = async (method: string, email: string) => {
        const isAllowed = await api.auth.check(method, email)
        if (!isAllowed) throw new Error('This login method is not available for this email address or an account with this email address does not exist.')
        return isAllowed
    }

    useEffect(() => {
        api.auth.methods().then((methods) => {
            setMethods(methods)
        }).catch(() => {})
    }, [])

    return (
        <div className="auth login">
            <div className="logo">
                <Logo />
            </div>
            {!method && (
                <div className="auth-step">
                    <h2>Welcome!</h2>
                    <p>Select an authentication method below to continue.</p>
                    <div className="auth-methods">
                        {methods?.map((method) => (
                            <Button key={method.driver} onClick={() => handleMethod(method)}>{method.name}</Button>
                        ))}
                    </div>
                </div>
            )}
            {method && method.driver === 'basic' && (
                <div className="auth-step">
                    <h2>Welcome!</h2>
                    <p>Enter your email and password to continue.</p>
                    <FormWrapper<LoginParams>
                        onSubmit={handleLogin(method.driver)}>
                        {form => <>
                            <TextInput.Field form={form} name="email" />
                            <TextInput.Field form={form} name="password" type="password" />
                        </>}
                    </FormWrapper>
                    <Button variant="plain" onClick={() => setMethod(undefined)}>Back</Button>
                </div>
            )}
            {method && method.driver === 'email' && (
                <div className="auth-step">
                    <h2>Welcome!</h2>
                    {message
                        ? <>
                            <Alert variant="info" title="Success">{message}</Alert>
                            <Button variant="plain" onClick={() => setMethod(undefined)}>Cancel</Button>
                        </>
                        : <>
                            <p>Next, please enter your email to receive an authentication link.</p>
                            <FormWrapper<LoginParams>
                                onSubmit={handleLogin(method.driver)}>
                                {form => <>
                                    <TextInput.Field form={form} name="email" />
                                </>}
                            </FormWrapper>
                            <Button variant="plain" onClick={() => setMethod(undefined)}>Back</Button>
                        </>
                    }
                </div>
            )}
            {method && !['basic', 'email'].includes(method.driver) && (
                <div className="auth-step">
                    <h2>Auth</h2>
                    <p>What is your email address?</p>
                    <FormWrapper<LoginParams>
                        onSubmit={handleLogin(method.driver)}
                        submitLabel={method.name}>
                        {form => <>
                            <TextInput.Field form={form} name="email" />
                        </>}
                    </FormWrapper>
                    <Button variant="secondary" onClick={() => setMethod(undefined)}>Back</Button>
                </div>
            )}
        </div>
    )
}
