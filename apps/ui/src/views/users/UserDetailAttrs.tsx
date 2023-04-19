import { useContext } from 'react'
import { UserContext } from '../../contexts'
import Heading from '../../ui/Heading'
import JsonPreview from '../../ui/JsonPreview'

export default function UserDetail() {

    const [{ external_id, email, phone, data }] = useContext(UserContext)

    return <>
        <Heading size="h3" title="Details" />
        <section className="container">
            <JsonPreview value={{ external_id, email, phone, ...data }} />
        </section>
    </>
}
