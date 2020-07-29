import * as prs from '@quenk/tendril/lib/app/api/storage/prs';

import { merge, empty } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { flatten } from '@quenk/noni/lib/data/record/path';
import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request, Filter } from '@quenk/tendril/lib/app/api/request';
import { fork, value } from '@quenk/tendril/lib/app/api/control';
import { ok, created } from '@quenk/tendril/lib/app/api/response';
import {
    noContent,
    notFound
} from '@quenk/tendril/lib/app/api/response';
import { Id, Model } from '@quenk/backdey-model-mongodb';

const defaultSearchParams =
    { page: 1, limit: 1000 * 1000, query: {}, sort: {}, fields: {} };

const defaultUpdateParams = { query: {} };

const defaultGetParams = { query: {}, fields: {} };

const defaultRemoveParams = { query: {} };

/**
 * CreateKeys are the PRS keys used by Resource#create.
 */
export const enum CreateKeys {

    data = 'resource.mongodb.create.data'

}

/**
 * SearchKeys are the PRS keys used by Resource#search.
 */
export const enum SearchKeys {

    query = 'resource.mongodb.search.query',

    page = 'resource.mongodb.search.page',

    limit = 'resource.mongodb.search.limit',

    sort = 'resource.mongodb.search.sort',

    fields = 'resource.mongodb.search.fields'

}

/**
 * UpdateKeys are the PRS keys used by Resource#update.
 */
export const enum UpdateKeys {

    data = 'resource.mongodb.update.data',

    query = 'resource.mongodb.update.query',

}

/**
 * GetKeys are the PRS keys used by Resource#get.
 */
export const enum GetKeys {

    query = 'resource.mongodb.get.query',

    fields = 'resource.mongodb.get.fields'

}

/**
 * RemoveKeys are the PRS keys used by Resource#remove.
 */
export const enum RemoveKeys {

    query = 'resource.mongodb.remove.query'

}

/**
 * CurrentSection holds pagination information on the current page.
 */
export interface CurrentSection {

    /**
     * count of the current set.
     */
    count: number,

    /**
     * page number of the current set in the total result.
     */
    page: number,

    /**
     * limit indicates how many rows are allowed per page.
     */
    limit: number

}

/**
 * TotalSection holds pagination information for the entire result.
 */
export interface TotalSection {

    /**
     * count of the entire result set.
     */
    count: number,

    /**
     * pages available for the entire result.
     */
    pages: number,

}

/**
 * SearchResult is the object created after a successful search.
 *
 * It houses the actual data as well as some additional meta information.
 */
export interface SearchResult<T extends Object> {

    /**
     * data is the paginated data returned from the query.
     */
    data: T[],

    /**
     * meta contains various useful pieces of information about the search 
     * result.
     */
    meta: {

        /**
         * pagination information for the result.
         */
        pagination: {

            /**
             * current page information.
             */
            current: CurrentSection,

            /**
             * total section (the entire result).
             */
            total: TotalSection

        }

    }

}

/**
 * Resource is the main interface of this module.
 *
 * It provides a basic JSON enable CRUD interface for a collection in the 
 * database. Extend BaseResource to benefit from the base implementation.
 * Additional methods can be added specific to your application's needs.
 */
export interface Resource<T extends Object> {

    /**
     * getModel provides an instance of the Resource's main Model.
     */
    getModel(): Action<Model<T>>

    /**
     * create a new document in the Resource's collection.
     *
     * The document data is fetched from the [[CreateKeys]] PRS keys.
     * A created response is sent with the id of the document once successful.
     */
    create: Filter<void>

    /**
     * search for a document in the Resource's collection.
     *
     * The query parameters are built using the [[SearchKeys]] PRS keys.
     * A successful result with found documents sends a [[SearchResult]], if
     * there are no matches the NoContent response is sent.
     */
    search: Filter<void>

    /**
     * update a single document in the Resource's collection.
     *
     * The document id is sourced from Request#params.id and the change data 
     * from [[UpdateKeys]].
     *
     * A successful update will result in an Success response whereas a
     * NotFound is sent if the update was not applied.
     */
    update: Filter<void>

    /**
     * get a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id. A successful fetch
     * will respond with a Success with the document as body otherwise a 
     * NotFound is sent.
     */
    get: Filter<void>

    /**
     * remove a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.a
     * A successful delete will respond with a Success or NotFound if the
     * document was not found.
     */
    remove: Filter<void>

}

/**
 * BaseResource provides the default Resource implementation.
 */
export abstract class BaseResource<T extends Object>
    implements Resource<T> {

    abstract getModel(): Action<Model<T>>

    create = (_: Request): Action<void> => {

        let that = this;

        return doAction(function*() {

            let model = yield that.getModel();

            let data = yield prs.getOrElse(CreateKeys.data, {});

            let id = yield runCreate(model, data);

            return created({ id });

        });

    }

    search = (_: Request): Action<void> => {

        let that = this;

        return doAction(function*() {

            let model = yield that.getModel();

            let mquery = yield prs.get(SearchKeys.query);

            if (mquery.isJust()) {

                let result = yield runSearch(model, mquery.get());

                if (result.data.length > 0)
                    return ok(result);
                else
                    return noContent();

            } else {

                return noContent();

            }

        });

    }

    update = (r: Request): Action<void> => {

        let that = this;

        return doAction(function*() {

            let model = yield that.getModel();

            let data = yield prs.getOrElse(UpdateKeys.data, {});

            let yes = yield runUpdate(model, <Id>r.params.id, data);

            return yes ? ok() : notFound();

        });

    }

    get = (r: Request): Action<void> => {

        let that = this;

        return doAction(function*() {

            let model = yield that.getModel();

            let mdoc = yield runGet(model, <Id>r.params.id);

            return mdoc.isJust() ? ok(mdoc.get()) : notFound();

        });

    }

    remove = (r: Request): Action<void> => {

        let that = this;

        return doAction(function*() {

            let model = yield that.getModel();

            let yes = yield runRemove(model, <Id>r.params.id);

            return yes ? ok() : notFound();

        });

    }

}

/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * The data provided SHOULD be validated according to the application's own 
 * rules.
 */
export const runCreate =
    <T extends Object>(model: Model<T>, data: T): Action<Id> =>
        doAction<Id>(function*() {

            return value(yield model.create(data));

        });

/**
 * runSearch for documents in the database that match the specified query.
 *
 * [[SearchKeys]] can be used to further configure the executed query.
 */
export const runSearch = <T extends Object>
    (model: Model<T>, query: Object): Action<SearchResult<T>> =>
    doAction<SearchResult<T>>(function*() {

        let { page, limit, sort, fields } = {

            page: yield prs.getOrElse(SearchKeys.page,
                defaultSearchParams.page),

            limit: yield prs.getOrElse(SearchKeys.limit,
                defaultSearchParams.limit),

            sort: yield prs.getOrElse(SearchKeys.sort,
                defaultSearchParams.sort),

            fields: yield prs.getOrElse(SearchKeys.fields,
                defaultSearchParams.fields)

        };

        let n = yield fork(model.count(query));

        let pageCount = Math.ceil(n / limit);

        //adjust page value so first page will skip 0 records
        page = page - 1;

        let current = ((page < 0) || (pageCount === 0)) ? 0 :
            (page >= pageCount) ? pageCount - 1 :
                page;

        let skip = current * limit;

        let o = { skip, limit, sort, projection: fields };

        let data = yield fork<T[]>(model.search(query, o));

        let payload = {

            data,

            meta: {

                pagination: {

                    current: {

                        count: data.length,

                        page: current + 1,

                        limit

                    },

                    total: {

                        count: pageCount,

                        pages: n

                    }

                }

            }

        };

        return value(payload);

    });

/**
 * runUpdate updates a single document by id using the provided changes.
 *
 * The operation will be carried out using the $set operator. The changes
 * should be validated by the application before passing to this function.
 * [[UpdateKeys]] can be set to customize the operation.
 */
export const runUpdate = <T extends Object>
    (model: Model<T>, id: Id, changes: Object): Action<boolean> =>
    doAction<boolean>(function*() {

        if (empty(changes))
            return value(false);

        let { query } = {

            query: yield prs.getOrElse(UpdateKeys.query,
                defaultUpdateParams.query),

        };

        let success =
            yield fork(model.update(id, flatten(changes), query));

        return value(success);

    });

/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the [[GetKeys]] PRS keys.
 */
export const runGet =
    <T extends Object>(model: Model<T>, id: Id): Action<Maybe<T>> =>
        doAction<Maybe<T>>(function*() {

            let { query, fields } = {

                query: yield prs.getOrElse(GetKeys.query,
                    defaultGetParams.query),

                fields: yield prs.getOrElse(GetKeys.fields,
                    defaultGetParams.fields)

            };

            let projection = merge({ _id: 0 }, fields);

            let maybeData =
                yield fork(model.get(id, query, { projection }));

            return value(maybeData);

        });

/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via [[RemoveKeys]] PRS keys.
 */
export const runRemove =
    <T extends Object>(model: Model<T>, id: Id): Action<boolean> =>
        doAction<boolean>(function*() {

            let { query } = {

                query: yield prs.getOrElse(RemoveKeys.query,
                    defaultRemoveParams.query),

            };

            let yes = yield fork(model.remove(id, query));

            return value(yes);

        });
