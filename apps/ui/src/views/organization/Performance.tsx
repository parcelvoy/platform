import Heading from '../../ui/Heading'
import { useContext, useEffect, useState } from 'react'
import api from '../../api'
import { Series } from '../../types'
import Tile, { TileGrid } from '../../ui/Tile'
import PageContent from '../../ui/PageContent'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { DataTable, JsonPreview, Modal } from '../../ui'
import { useSearchParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import './Performance.css'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'
import { useTranslation } from 'react-i18next'

const Chart = ({ series }: { series: Series[] }) => {
    const strokes = ['#3C82F6', '#12B981']
    const [preferences] = useContext(PreferencesContext)
    return (
        <ResponsiveContainer width="100%" aspect={5}>
            <LineChart
                margin={{
                    top: 5,
                    left: 10,
                    bottom: 5,
                    right: 0,
                }}
            >
                <XAxis dataKey="date"
                    tickFormatter={date => format(date, 'HH:mm aa')}
                    type="number"
                    domain = {['auto', 'auto']}
                    tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={count => count.toLocaleString() } />
                <CartesianGrid vertical={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-grey)',
                    }}
                    labelFormatter={(date: number) => formatDate(preferences, date)}
                    formatter={(value, name) => [`${name}: ${value.toLocaleString()}`]}
                />
                <Legend />
                {series.map((s, index) => (
                    <Line
                        type="monotone"
                        dataKey="count"
                        data={s.data}
                        name={s.label}
                        key={s.label}
                        stroke={strokes[index]}
                        dot={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

export default function Performance() {
    const { t } = useTranslation()
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
                    label: t('completed'),
                    data: data.map(item => ({
                        date: Date.parse(item.date as string),
                        count: item.count,
                    })),
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
            .then((series) => {
                setJobMetrics(
                    series.map(({ data, label }) => ({
                        label: t(label),
                        data: data.map(item => ({
                            date: Date.parse(item.date as string),
                            count: item.count,
                        })),
                    })),
                )
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

    return (
        <PageContent
            title="Performance"
            desc="View queue throughput for your project."
        >
            <Heading size="h4" title="Queue Throughput" />
            {metrics && <div>
                <TileGrid numColumns={4}>
                    <Tile title={waiting.toLocaleString()} size="large">In Queue</Tile>
                </TileGrid>
                <Chart series={metrics} />
            </div>}
            <br /><br />
            <Heading size="h4" title="Job Metrics" actions={
                <SingleSelect
                    size="small"
                    options={jobs}
                    value={currentJob}
                    onChange={handleChangeJob}
                />
            } />
            {jobMetrics && <Chart series={jobMetrics} />}

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
