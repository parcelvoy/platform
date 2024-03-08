import { useContext } from 'react'
import PageContent from '../../ui/PageContent'
import FormWrapper from '../../ui/form/FormWrapper'
import { OrganizationContext } from '../../contexts'
import TextInput from '../../ui/form/TextInput'
import { Organization } from '../../types'
import Heading from '../../ui/Heading'
import api from '../../api'
import { toast } from 'react-hot-toast/headless'
import { Button } from '../../ui'

export default function Settings() {
    const [organization] = useContext(OrganizationContext)
    const deleteOrganization = async () => {
        if (confirm('Are you sure you want to delete this organization?')) {
            await api.organizations.delete()
            await api.auth.logout()
            window.location.href = '/'
        }
    }
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

                <br /><br />
                <Heading size="h3" title="Danger Zone" />
                <p>Deleting your organization will completely remove it from the system along with all associated accounts, projects and data.</p>
                <Button variant="destructive" onClick={async () => await deleteOrganization()}>Delete Organization</Button>
            </PageContent>
        </>
    )
}
