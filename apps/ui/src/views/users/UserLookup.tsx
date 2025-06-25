import { useCallback, useContext } from 'react'
import { User } from '../../types'
import Modal, { ModalProps } from '../../ui/Modal'
import { ProjectContext } from '../../contexts'
import { useTranslation } from 'react-i18next'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import api from '../../api'
import { Button, ButtonGroup } from '../../ui'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'

interface UserLookupProps extends Omit<ModalProps, 'title'> {
    onSelected: (user: User) => void
}

interface UserLookupSearch {
    email: string
}

export const UserLookup = ({ open, onClose, onSelected }: UserLookupProps) => {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const state = useSearchTableState(useCallback(async params => await api.users.search(project.id, params), [project]))
    const handleSearch = async ({ email }: UserLookupSearch) => {
        state.setParams({
            ...state.params,
            q: email,
        })
    }

    return <Modal
        title={t('user_lookup')}
        open={open}
        onClose={onClose}
        size="regular">
        <div className="user-lookup">
            <FormWrapper<UserLookupSearch>
                onSubmit={handleSearch}
                showSubmitButton={false}
            >
                {form => (
                    <ButtonGroup>
                        <TextInput.Field
                            form={form}
                            name="email"
                            placeholder={(t('enter_email'))}
                            hideLabel={true} />
                        <Button
                            type="submit"
                            variant="secondary"
                        >{t('search')}</Button>
                    </ButtonGroup>
                )}
            </FormWrapper>
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
