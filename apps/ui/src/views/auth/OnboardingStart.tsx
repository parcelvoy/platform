import { LinkButton } from '../../ui/Button'

export default function Onboarding() {
    return (
        <>
            <h1>Welcome!</h1>
            <p>Looks like everything is working with the installation! Now let&apos;s get you setup and ready to run some campaigns!</p>
            <LinkButton to="/onboarding/project">Get Started</LinkButton>
        </>
    )
}
