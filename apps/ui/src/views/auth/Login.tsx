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
import { useTranslation } from 'react-i18next'

interface LoginParams {
    email: string
    password?: string
}

export default function Login() {
    const { t } = useTranslation()
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
                setMessage(t('login_email_confirmation'))
            } else {
                await checkEmail(method, email)
                handleRedirect(method, email)
            }
        }
    }

    const checkEmail = async (method: string, email: string) => {
        const isAllowed = await api.auth.check(method, email)
        if (!isAllowed) throw new Error(t('login_method_not_available'))
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
                    <h2>{t('welcome')}</h2>
                    <p>{t('login_select_method')}</p>
                    <div className="auth-methods">
                        {methods?.map((method) => (
                            <Button key={method.driver} onClick={() => handleMethod(method)}>{method.name}</Button>
                        ))}
                    </div>
                </div>
            )}
            {method && method.driver === 'basic' && (
                <div className="auth-step">
                    <h2>{t('welcome')}</h2>
                    <p>{t('login_basic_instructions')}</p>
                    <FormWrapper<LoginParams>
                        onSubmit={handleLogin(method.driver)}>
                        {form => <>
                            <TextInput.Field form={form} name="email" />
                            <TextInput.Field form={form} name="password" type="password" />
                        </>}
                    </FormWrapper>
                    <Button variant="plain" onClick={() => setMethod(undefined)}>{t('back')}</Button>
                </div>
            )}
            {method && method.driver === 'email' && (
                <div className="auth-step">
                    <h2>{t('welcome')}</h2>
                    {message
                        ? <>
                            <Alert variant="info" title="Success">{message}</Alert>
                            <Button variant="plain" onClick={() => setMethod(undefined)}>{t('cancel')}</Button>
                        </>
                        : <>
                            <p>{t('login_email_instructions')}</p>
                            <FormWrapper<LoginParams>
                                onSubmit={handleLogin(method.driver)}>
                                {form => <>
                                    <TextInput.Field form={form} name="email" />
                                </>}
                            </FormWrapper>
                            <Button variant="plain" onClick={() => setMethod(undefined)}>{t('next')}</Button>
                        </>
                    }
                </div>
            )}
            {method && !['basic', 'email'].includes(method.driver) && (
                <div className="auth-step">
                    <h2>{t('welcome')}</h2>
                    <p>{t('login_email_available_methods')}</p>
                    <FormWrapper<LoginParams>
                        onSubmit={handleLogin(method.driver)}
                        submitLabel={method.name}>
                        {form => <>
                            <TextInput.Field form={form} name="email" />
                        </>}
                    </FormWrapper>
                    <Button variant="secondary" onClick={() => setMethod(undefined)}>{t('back')}</Button>
                </div>
            )}
        </div>
    )
}
