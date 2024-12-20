import Heading from '../../ui/Heading'
import { Chart, AxisOptions } from 'react-charts'
import { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { Metric } from '../../types'
import { PreferencesContext } from '../../ui/PreferencesContext'
import Tile, { TileGrid } from '../../ui/Tile'
import PageContent from '../../ui/PageContent'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { DataTable, JsonPreview, Modal } from '../../ui'
import { useSearchParams } from 'react-router-dom'

interface Series {
    label: string
    data: Metric[]
    scaleType: string
}

export default function Performance() {
    const [preferences] = useContext(PreferencesContext)
    const [waiting, setWaiting] = useState(0)

    const [metrics, setMetrics] = useState<Series[] | undefined>()

    const [searchParams, setSearchParams] = useSearchParams()
    const job = searchParams.get('job') ?? undefined

    const [jobs, setJobs] = useState<string[]>([])
    const [currentJob, setCurrentJob] = useState<string | undefined>(job)
    const [jobMetrics, setJobMetrics] = useState<Series[] | undefined>()

    const [failed, setFailed] = useState<Array<Record<string, any>>>([])
    const [selectedFailed, setSelectedFailed] = useState<Record<string, any> | undefined>()

    useEffect(() => {
        api.organizations.metrics()
            .then(({ waiting, data }) => {
                const series: Series = {
                    label: 'Count',
                    data: data.map(item => ({
                        date: new Date(item.date),
                        count: item.count,
                    })),
                    scaleType: 'time',
                }
                setMetrics([series])
                setWaiting(waiting)
            })
            .catch(() => {})

        api.organizations.jobs()
            .then((jobs) => {
                setJobs(jobs)
                if (!currentJob) setCurrentJob(jobs[0])
            })
            .catch(() => {})

        api.organizations.failed()
            .then((failed) => {
                setFailed(failed)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        currentJob && api.organizations.jobPerformance(currentJob)
            .then((metrics) => {
                const series: Series = {
                    label: 'Count',
                    data: metrics.map(item => ({
                        date: new Date(item.date),
                        count: item.count,
                    })),
                    scaleType: 'time',
                }
                setJobMetrics([series])
            })
            .catch(() => {})
    }, [currentJob])

    const handleChangeJob = (job: string | undefined) => {
        setCurrentJob(job)
        if (job) {
            searchParams.set('job', job)
            setSearchParams(searchParams)
        }
    }

    const primaryAxis = useMemo(
        (): AxisOptions<Metric> => ({
            getValue: datum => datum.date,
        }),
        [],
    )
    const secondaryAxes = useMemo(
        (): Array<AxisOptions<Metric>> => [{
            getValue: datum => datum.count,
            elementType: 'line',
        }],
        [],
    )

    return (
        <PageContent
            title="Performance"
            desc="View queue throughput for your project."
        >
            <Heading size="h4" title="Queue Throughput" />
            {metrics && <div >
                <TileGrid numColumns={4}>
                    <Tile title={waiting.toLocaleString()} size="large">In Queue</Tile>
                </TileGrid>
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    <Chart
                        options={{
                            data: metrics,
                            primaryAxis,
                            secondaryAxes,
                            initialWidth: 500,
                            initialHeight: 200,
                            tooltip: false,
                            dark: preferences.mode === 'dark',
                        }}
                    />
                </div>
            </div>}
            <br /><br />
            <Heading size="h4" title="Jobs" actions={
                <SingleSelect
                    size="small"
                    options={jobs}
                    value={currentJob}
                    onChange={handleChangeJob}
                />
            } />
            {jobMetrics && <div style={{ position: 'relative', minHeight: '200px' }}>
                <Chart
                    options={{
                        data: jobMetrics,
                        primaryAxis,
                        secondaryAxes,
                        initialWidth: 500,
                        initialHeight: 200,
                        tooltip: false,
                        dark: preferences.mode === 'dark',
                    }}
                />
            </div>}

            {failed.length && <>
                <Heading size="h4" title="Failed" />
                <div className="failed">
                    <DataTable items={failed} columns={[
                        { key: 'id', title: 'ID' },
                        { key: 'name', title: 'Name' },
                        { key: 'attemptsMade', title: 'Attempts Made' },
                        { key: 'failedReason', title: 'Reason' },
                        {
                            key: 'timestamp',
                            title: 'Timestamp',
                            cell: ({ item: { timestamp } }) => {
                                const date = new Date(timestamp)
                                return date.toLocaleString()
                            },
                        },
                    ]} onSelectRow={row => setSelectedFailed(row) }/>
                </div>
            </>}

            <Modal
                title="Failed Job"
                size="large"
                open={!!selectedFailed}
                onClose={() => setSelectedFailed(undefined)}>
                {selectedFailed && <JsonPreview value={selectedFailed} />}
            </Modal>
        </PageContent>
    )
}
