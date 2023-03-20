import { Context } from 'react'
import { RouteObject } from 'react-router-dom'
import { ProjectEntityPath } from '../api'
import { UseStateContext } from '../types'
import ErrorPage from './ErrorPage'
import { StatefulLoaderContextProvider } from './LoaderContextProvider'

interface StatefulRoute<T extends Record<string, any>> {
    context?: Context<UseStateContext<T>>
    apiPath: ProjectEntityPath<T>
    path: string
    element?: JSX.Element
    children?: Array<RouteObject & { tab?: string }>
}

export function createStatefulRoute<T extends { id: number }>({ context, path, apiPath, element, children = [] }: StatefulRoute<T>): RouteObject {
    return {
        path,
        loader: async ({ params: { projectId = '', entityId = '' } }) => await apiPath.get(projectId, entityId),
        element: context
            ? (
                <StatefulLoaderContextProvider context={context}>
                    {element}
                </StatefulLoaderContextProvider>
            )
            : element,
        children: children.map(({ tab, ...rest }) => rest),
        errorElement: <ErrorPage />,
    }
}
