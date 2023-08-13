import { useContext } from 'react'
import PageContent from '../../ui/PageContent'
import FormWrapper from '../../ui/form/FormWrapper'
import { OrganizationContext } from '../../contexts'
import TextInput from '../../ui/form/TextInput'
import { Organization } from '../../types'
import Heading from '../../ui/Heading'
import api from '../../api'
import { toast } from 'react-hot-toast/headless'

export default function Settings() {
    const [organization] = useContext(OrganizationContext)
    return (
        <>
            <PageContent title="Settings">
                <FormWrapper<Organization>
                    defaultValues={organization}
                    onSubmit={async ({ username, domain, tracking_deeplink_mirror_url }) => {
                        await api.organizations.update(organization.id, { username, domain, tracking_deeplink_mirror_url })

                        toast.success('Saved organization settings')
                    }}
                    submitLabel="Save Settings"
                >
                    {form => <>
                        <Heading size="h3" title="General" />
                        <TextInput.Field
                            form={form}
                            name="username"
                            subtitle="The organization username. Used for the subdomain that the organization is hosted under." />
                        <TextInput.Field
                            form={form}
                            name="domain"
                            subtitle="If filled, users who log in with SSO and have this domain will be automatically joined to the organization." />
                        <Heading size="h3" title="Tracking" />
                        <TextInput.Field form={form} name="tracking_deeplink_mirror_url" label="Tracking Deeplink Mirror URL"
                            subtitle="The URL to clone universal link settings from." />
                    </>}
                </FormWrapper>
            </PageContent>
        </>
    )
}
