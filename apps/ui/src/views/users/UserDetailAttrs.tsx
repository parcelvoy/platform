import { useContext } from 'react'
import { UserContext } from '../../contexts'
import Heading from '../../ui/Heading'
import JsonPreview from '../../ui/JsonPreview'
import { useTranslation } from 'react-i18next'

export default function UserDetail() {
    const { t } = useTranslation()
    const [{ external_id, email, phone, timezone, locale, devices, data }] = useContext(UserContext)

    return <>
        <Heading size="h3" title={t('details')} />
        <section className="container">
            <JsonPreview value={{ external_id, email, phone, timezone, locale, devices, ...data }} />
        </section>
    </>
}
