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

export function Projects() {
    const navigate = useNavigate()
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
            title="Projects"
            desc="Projects are isolated workspaces with their own sets of users, events, lists, campaigns, and journeys."
            actions={
                <Button
                    variant="primary"
                    icon={<PlusIcon />}
                    onClick={() => setOpen(true)}
                >
                    {'Create Project'}
                </Button>
            }
        >
            {
                !!recents?.length && (
                    <>
                        <h3>Recently Visited</h3>
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
            <h3>All Projects</h3>
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
                title="Create Project"
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
