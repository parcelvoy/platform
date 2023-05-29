import { Knex as KnexOriginal } from 'knex'
declare module 'knex' {
    namespace Knex {
        interface QueryInterface {
            when<TResult>(
                condition: boolean,
                fnif: (builder: QueryBuilder<any>) => QueryBuilder<any>,
                fnelse?: (builder: QueryBuilder<any>) => QueryBuilder<any>,
            ): KnexOriginal.QueryBuilder<any, TResult>
        }
    }
}
