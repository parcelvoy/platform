import Heading from '../../ui/Heading'
import { Chart, AxisOptions } from 'react-charts'
import { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { Metric } from '../../types'
import { PreferencesContext } from '../../ui/PreferencesContext'
import Tile, { TileGrid } from '../../ui/Tile'
import PageContent from '../../ui/PageContent'

interface Series {
    label: string
    data: Metric[]
    scaleType: string
}

export default function Performance() {
    const [preferences] = useContext(PreferencesContext)
    const [data, setData] = useState<Series[] | undefined>()
    const [waiting, setWaiting] = useState(0)
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
                setData([series])
                setWaiting(waiting)
            })
            .catch(() => {})
    }, [])

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
            {data && <div style={{ position: 'relative', height: '250px' }}>
                <TileGrid numColumns={4}>
                    <Tile title={waiting.toLocaleString()} size="large">In Queue</Tile>
                </TileGrid>
                <Chart
                    options={{
                        data,
                        primaryAxis,
                        secondaryAxes,
                        initialWidth: 500,
                        initialHeight: 250,
                        tooltip: false,
                        dark: preferences.mode === 'dark',
                    }}
                />
            </div>}
        </PageContent>
    )
}
