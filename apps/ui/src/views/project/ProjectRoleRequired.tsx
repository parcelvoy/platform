import { PropsWithChildren, useContext } from 'react'
import { ProjectContext } from '../../contexts'
import { ProjectRole, projectRoles } from '../../types'
import Alert from '../../ui/Alert'

type ProjectRoleRequiredProps = PropsWithChildren<{
    minRole: ProjectRole
}>

export function ProjectRoleRequired({ children, minRole }: ProjectRoleRequiredProps) {
    const [project] = useContext(ProjectContext)

    if (projectRoles.indexOf(minRole) > projectRoles.indexOf((project as any).role!)) {
        return (
            <Alert variant="warn" title="Permission Required">
                Please speak with your administrator to get access to this section.
            </Alert>
        )
    }

    return (
        <>
            {children}
        </>
    )
}
