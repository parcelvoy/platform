import { useContext } from 'react'
import { UserContext } from '../../contexts'
import { JsonViewer } from '@textea/json-viewer'
import Heading from '../../ui/Heading'

export default function UserDetail() {

    const [{ external_id, email, phone, data }] = useContext(UserContext)

    return <>
        <Heading size="h3" title="Details" />
        <section className="container">
            <JsonViewer value={{ external_id, email, phone, ...data }} rootName={false} />
        </section>
    </>
}
