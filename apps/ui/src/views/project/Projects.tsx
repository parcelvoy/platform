import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useResolver } from '../../hooks'
import { Project } from '../../types'
import Button from '../../ui/Button'
import PageContent from '../../ui/PageContent'
import { PreferencesContext } from '../../ui/PreferencesContext'
import Tile, { TileGrid } from '../../ui/Tile'
import { formatDate, getRecentProjects } from '../../utils'
import logoUrl from '../../assets/parcelvoylogo.png'
import { PlusIcon } from '../../ui/icons'
import Modal from '../../ui/Modal'
import ProjectForm from './ProjectForm'
import { useTranslation } from 'react-i18next'

export function Projects() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [preferences] = useContext(PreferencesContext)
    const [projects] = useResolver(api.projects.all)
    const recents = useMemo(() => {
        const recents = getRecentProjects()
        if (!projects?.length || !recents.length) return []
        return recents.reduce<Array<{
            project: Project
            when: number
        }>>((a, { id, when }) => {
            const project = projects.find(p => p.id === id)
            if (project) {
                a.push({
                    when,
                    project,
                })
            }
            return a
        }, [])
    }, [projects])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (projects && !projects.length) {
            navigate('/onboarding')
        }
    }, [projects, navigate])

    return (
        <PageContent
            title={t('projects')}
            desc={t('projects_description')}
            actions={
                <Button
                    variant="primary"
                    icon={<PlusIcon />}
                    onClick={() => setOpen(true)}
                >
                    {t('create_project')}
                </Button>
            }
        >
            {
                !!recents?.length && (
                    <>
                        <h3>{t('recently_viewed')}</h3>
                        <TileGrid>
                            {
                                recents.map(({ project, when }) => (
                                    <Tile
                                        key={project.id}
                                        onClick={() => navigate('/projects/' + project.id)}
                                        title={project.name || 'Untitled Project'}
                                        iconUrl={logoUrl}
                                    >
                                        {formatDate(preferences, when)}
                                    </Tile>
                                ))
                            }
                        </TileGrid>
                    </>
                )
            }
            <h3>{t('projects_all')}</h3>
            <TileGrid>
                {
                    projects?.map(project => (
                        <Tile
                            key={project.id}
                            onClick={() => navigate('/projects/' + project.id)}
                            title={project.name}
                            iconUrl={logoUrl}
                        >
                            {formatDate(preferences, project.created_at)}
                        </Tile>
                    ))
                }
            </TileGrid>
            <Modal
                open={open}
                onClose={setOpen}
                title={t('create_project')}
                size="regular"
            >
                <ProjectForm
                    onSave={project => {
                        setOpen(false)
                        navigate('/projects/' + project.id)
                    }}
                />
            </Modal>
        </PageContent>
    )
}
