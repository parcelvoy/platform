import { useCallback, useContext, useState } from 'react'
import { User } from '../../types'
import Modal, { ModalProps } from '../../ui/Modal'
import { ProjectContext } from '../../contexts'
import { useTranslation } from 'react-i18next'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import api from '../../api'
import { Button, ButtonGroup } from '../../ui'
import TextInput from '../../ui/form/TextInput'

interface UserLookupProps extends Omit<ModalProps, 'title'> {
    onSelected: (user: User) => void
}

export const UserLookup = ({ open, onClose, onSelected }: UserLookupProps) => {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const state = useSearchTableState(useCallback(async params => await api.users.search(project.id, params), [project]))
    const [value, setValue] = useState<string>('')

    return <Modal
        title={t('user_lookup')}
        open={open}
        onClose={onClose}
        size="regular">
        <div className="user-lookup">
            <ButtonGroup>
                <TextInput<string>
                    name="search"
                    placeholder={(t('enter_email'))}
                    hideLabel={true}
                    value={value}
                    onChange={setValue} />
                <Button
                    variant="secondary"
                    onClick={() => state.setParams({
                        ...state.params,
                        q: value,
                    })}>{t('search')}</Button>
            </ButtonGroup>
            <SearchTable
                {...state}
                columns={[
                    { key: 'full_name', title: 'Name' },
                    { key: 'email' },
                    { key: 'phone' },
                ]}
                onSelectRow={(user) => {
                    onSelected(user)
                    onClose(false)
                }} />
        </div>
    </Modal>
}
