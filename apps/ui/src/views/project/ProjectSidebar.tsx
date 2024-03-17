import { NavLinkProps, useNavigate } from 'react-router-dom'
import { PropsWithChildren, ReactNode, useCallback, useContext } from 'react'
import { ProjectContext } from '../../contexts'
import api from '../../api'
import { useResolver } from '../../hooks'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { checkProjectRole, getRecentProjects } from '../../utils'
import { ProjectRole } from '../../types'
import Sidebar from '../../ui/Sidebar'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
    links?: Array<NavLinkProps & {
        key: string
        icon: ReactNode
        minRole?: ProjectRole
    }>
    prepend?: ReactNode
    append?: ReactNode
}

export default function ProjectSidebar({ children, links }: PropsWithChildren<SidebarProps>) {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const [recents] = useResolver(useCallback(async () => {
        const recentIds = getRecentProjects().filter(p => p.id !== project.id).map(p => p.id)
        const recents: Array<typeof project> = []
        if (recentIds.length) {
            const projects = await api.projects.search({
                limit: recentIds.length,
                id: recentIds,
            }).then(r => r.results ?? [])
            for (const id of recentIds) {
                const recent = projects.find(p => p.id === id)
                if (recent) {
                    recents.push(recent)
                }
            }
        }
        return [
            project,
            ...recents,
            {
                id: 0,
                name: t('view_all'),
            },
        ]
    }, [project]))

    return (
        project && <Sidebar
            links={
                links?.filter(({ minRole }) =>
                    !minRole
                    || checkProjectRole(minRole, project.role),
                ).map(({ minRole, ...props }) => props)
            }
            prepend={
                <SingleSelect
                    value={project}
                    onChange={project => {
                        if (project.id === 0) {
                            navigate('/organization/projects')
                        } else {
                            navigate(`/projects/${project.id}`)
                        }
                    }}
                    options={recents ?? []}
                    getSelectedOptionDisplay={p => (
                        <>
                            <div className="project-switcher-label">{t('project')}</div>
                            <div className="project-switcher-value">{p.name}</div>
                        </>
                    )}
                    hideLabel
                    buttonClassName="project-switcher"
                    variant="minimal"
                />
            }
        >{children}</Sidebar>
    )
}
