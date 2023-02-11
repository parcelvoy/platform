import { Outlet, useLoaderData } from 'react-router-dom'
import { AdminContext } from '../contexts'
import { Admin } from '../types'

export default function Auth() {
    return (
        <AdminContext.Provider value={useLoaderData() as Admin}>
            <Outlet />
        </AdminContext.Provider>
    )
}
