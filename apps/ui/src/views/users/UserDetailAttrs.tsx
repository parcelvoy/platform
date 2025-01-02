import { useContext } from 'react'
import { UserContext } from '../../contexts'
import Heading from '../../ui/Heading'
import JsonPreview from '../../ui/JsonPreview'
import { useTranslation } from 'react-i18next'
import { flattenUser } from '../../ui/utils'

export default function UserDetail() {
    const { t } = useTranslation()
    const [user] = useContext(UserContext)

    return <>
        <Heading size="h3" title={t('details')} />
        <section className="container">
            <JsonPreview value={flattenUser(user)} />
        </section>
    </>
}
