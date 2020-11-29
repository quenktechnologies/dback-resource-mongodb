import * as mongo from 'mongodb';

import { merge, empty } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { flatten } from '@quenk/noni/lib/data/record/path';
import { isObject } from '@quenk/noni/lib/data/type';

import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { fork, value, noop } from '@quenk/tendril/lib/app/api/control';
import { checkout } from '@quenk/tendril/lib/app/api/pool';
import {
    ok,
    created,
    badRequest,
    conflict
} from '@quenk/tendril/lib/app/api/response';
import {
    noContent,
    notFound
} from '@quenk/tendril/lib/app/api/response';

import { Id, Model } from '@quenk/dback-model-mongodb';

const defaultSearchParams =
    { page: 1, limit: 1000 * 1000, query: {}, sort: {}, fields: {} };

export const KEY_CREATE_ID = 'resource.mongodb.create.id';
export const KEY_SEARCH_PARAMS = 'resource.mongodb.search.params';
export const KEY_UPDATE_PARAMS = 'resource.mongodb.update.params';
export const KEY_GET_PARAMS = 'resource.mongodb.search.params';
export const KEY_REMOVE_PARAMS = 'resource.mongodb.remove.params';

export const ERR_PAYLOAD_INVALID = 'payload invalid';
export const ERR_NO_QUERY = 'no query parameters detected';

/**
 * SearchParams used in search query execution.
 */
export interface SearchParams {

    /**
     * query object used to filter documents.
     */
    query: Object,

    /**
     * page to begin retrieving documents.
     */
    page: number,

    /**
     * limit on documents to retreive.
     *
     * Paging is based on this number and not the total possible result.
     */
    limit: number,

    /**
     * sort object.
     */
    sort: Object

    /**
     * fields to retrieve for each document.
     */
    fields: object

}

/**
 * UpdateParams used in update operations.
 */
export interface UpdateParams {

    /**
     * query object used to further specify the target object.
     */
    query: Object,

    /**
     * changes to be made via the $set operation.
     *
     * This is in addition to the request body.
     */
    changes: Object

}

/**
 * GetParams used in single result search operations.
 */
export interface GetParams {

    /**
     * query object used to further specify the target object.
     */
    query: Object,

    /**
     * fields to project on.
     */
    fields: object

}

/**
 * RemoveParams used in remove operations.
 */
export interface RemoveParams {

    /**
     * query object used to further specify the target object.
     */
    query: Object,

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
 * It houses the actual data as well as some additional meta information related
 * to paging.
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
 * It provides a basic JSON based CSUGR interface for a target collection.
 * BaseResource provides a base implementation with hooks for additional
 * processing.
 *
 * Warning: All data passed to this interface SHOULD BE PROPERLY VALIDATED!!
 * Otherwise users may be able to manipulate queries and have direct access
 * to the database.
 */
export interface Resource {

    /**
     * create a new document in the Resource's collection.
     *
     * The document data is read from the request body.
     * A created response is sent with the id of the document if successful.
     */
    create(r: Request): Action<void>

    /**
     * search for a document in the Resource's collection.
     *
     * The query parameters are built using the [[KEY_SEARCH_PARAMS]] PRS keys.
     * A successful result with found documents sends a [[SearchResult]], if
     * there are no matches the [[NoContent]] response is sent.
     */
    search(r: Request): Action<void>

    /**
     * update a single document in the Resource's collection.
     *
     * The document id is sourced from Request#params.id and the change data 
     * from the request body. Additional conditions can be specified via the
     * [[KEY_UPDATE_PARAMS]] PRS key.
     *
     * A successful update will result in an [[Ok]] response whereas a
     * [[NotFound]] is sent if the update was not applied.
     */
    update(r: Request): Action<void>

    /**
     * get a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id. 
     * Additional conditions can be specified via the [[KEY_GET_PARAMS]] PRS key.
     *
     * A successful fetch will respond with [[Ok]] with the document as body 
     * otherwise [[NotFound]] is sent.
     */
    get(r: Request): Action<void>

    /**
     * remove a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.a
     * Additional conditions can be specified via the [[KEY_REMOVE_PARAMS]] PRS
     * key.
     *
     * A successful delete will respond with a [[Ok]] or [[NotFound]] if the
     * document was not found.
     */
    remove(r: Request): Action<void>

}

/**
 * BaseResource provides the default Resource implementation.
 *
 * Warning: All data passed to this class MUST BE PROPERLY VALIDATED!!
 * Otherwise users may be able to manipulate queries and have direct access
 * to the database.
 *
 * @param conn - This is the id of the pooled mongodb connection that will be
 *               checked out before each operation.
 */
export abstract class BaseResource<T extends Object>
    implements Resource {

    constructor(public conn: string = 'main') { }

    /**
     * getModel provides an instance of the Resource's main Model.
     */
    abstract getModel(db: mongo.Db): Model<T>

    /**
     * before is a filter that is executed before each of the CSUGR
     * methods.
     *
     * It can be overriden to execute other middleware.
     */
    before(r: Request): Action<Request> {

        return value(r);

    }

    /**
     * beforeCreate is executed before create().
     */
    beforeCreate(r: Request): Action<Request> {

        return value(r);

    }

    /**
     * beforeSearch is executed before search().
     */
    beforeSearch(r: Request): Action<Request> {

        return value(r);

    }

    /**
     * beforeUpdate is executed before update().
     */
    beforeUpdate(r: Request): Action<Request> {

        return value(r);

    }

    /**
     * beforeGet is executed before get().
     */
    beforeGet(r: Request): Action<Request> {

        return value(r);

    }

    /**
     * beforeRemove is executed before remove().
     */
    beforeRemove(r: Request): Action<Request> {

        return value(r);

    }

    create(r: Request): Action<void> {

        let that = this;

        return doAction<void>(function*() {

            if (!isObject(r.body))
                return conflict({ error: ERR_PAYLOAD_INVALID });

            r = yield that.before(r);

            r = yield that.beforeCreate(r);

            let db = yield checkout(that.conn);

            let model = that.getModel(db);

            let id = yield runCreate<T>(model, <T><Object>r.body);

            r.prs.set(KEY_CREATE_ID, id);

            yield created({ id });

            yield that.after(r);

            return that.afterCreate(r);

        });

    }

    search(r: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            let mparams = r.prs.get(KEY_SEARCH_PARAMS);

            if (mparams.isNothing())
                return badRequest({ error: ERR_NO_QUERY });

            let params = <SearchParams><object>mparams.get();

            r = yield that.before(r);

            r = yield that.beforeSearch(r);

            let db = yield checkout(that.conn);

            let model = that.getModel(db);

            let result = yield runSearch(model, params);

            yield (result.data.length > 0) ? ok(result) : noContent();

            yield that.after(r);

            return that.afterSearch(r);

        });

    }

    update(r: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            if (!isObject(r.body))
                return conflict({ error: ERR_PAYLOAD_INVALID });

            if (!r.params.id)
                return notFound();

            r = yield that.before(r);

            r = yield that.beforeUpdate(r);

            let extraParams = r.prs.getOrElse(
                KEY_UPDATE_PARAMS,
                { query: {}, changes: {} }
            );

            let db = yield checkout(that.conn);

            let model = that.getModel(db);

            let yes = yield runUpdate(
                model,
                <Id>r.params.id,
                <Object>r.body,
                <UpdateParams><object>extraParams);

            yield yes ? ok() : notFound();

            yield that.after(r);

            return that.afterUpdate(r);

        });

    }

    get(r: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            if (!r.params.id)
                return notFound();

            r = yield that.before(r);

            r = yield that.beforeGet(r);

            let params = r.prs.getOrElse(KEY_GET_PARAMS, {

                query: {},

                fields: {},

            });

            let db = yield checkout(that.conn);

            let model = that.getModel(db);

            let mdoc = yield runGet(model, <Id>r.params.id,
                <GetParams><object>params);

            yield mdoc.isJust() ? ok(mdoc.get()) : notFound();

            yield that.after(r);

            return that.afterGet(r);

        });

    }

    remove(r: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            if (!r.params.id)
                return notFound();

            r = yield that.before(r);

            r = yield that.beforeRemove(r);

            let params = r.prs.getOrElse(KEY_REMOVE_PARAMS, {
                query: {},
            });

            let db = yield checkout(that.conn);

            let model = that.getModel(db);

            let yes = yield runRemove(model, <Id>r.params.id,
                <RemoveParams><object>params);

            yield yes ? ok() : notFound();

            yield that.after(r);

            return that.afterRemove(r);

        });

    }

    /**
     * after is a filter that is executed after each of the CSUGR
     * methods have responded to the client.
     *
     * It can be overriden to execute other middleware.
     */
    after(_: Request): Action<void> {

        return noop();

    }

    /**
     * afterCreate is executed after [[create]] sends a response..
     */
    afterCreate(_: Request): Action<void> {

        return noop();

    }

    /**
     * afterSearch is executed after [[search]] sends a response.
     */
    afterSearch(_: Request): Action<void> {

        return noop();

    }

    /**
     * afterUpdate is executed after [[update]] sends a response.
     */
    afterUpdate(_: Request): Action<void> {

        return noop();

    }

    /**
     * afterGet is executed after [[get]] sends a response.
     */
    afterGet(_: Request): Action<void> {

        return noop();

    }

    /**
     * afterRemove is executed after [[remove]] sends a response.
     */
    afterRemove(_: Request): Action<void> {

        return noop();

    }

}

/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export const runCreate =
    <T extends Object>(model: Model<T>, data: T): Action<Id> =>
        doAction<Id>(function*() {

            return value(yield fork(model.create(data)));

        });

/**
 * runSearch for documents in the database that match the specified 
 * SearchParams.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export const runSearch = <T extends Object>
    (model: Model<T>, params: SearchParams): Action<SearchResult<T>> =>
    doAction<SearchResult<T>>(function*() {

        let { query, page, limit, sort, fields } = {

            query: params.query || {},

            page: params.page || defaultSearchParams.page,

            limit: params.limit || defaultSearchParams.limit,

            sort: params.sort || defaultSearchParams.sort,

            fields: params.fields || defaultSearchParams.fields

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

                        count: n,

                        pages: pageCount

                    }

                }

            }

        };

        return value(payload);

    });

/**
 * runUpdate updates a single document by id.
 *
 * The UpdateParams may be specified to add further details to the operation.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export const runUpdate =
    <T extends Object>(
        model: Model<T>,
        id: Id,
        changes: Object,
        params: UpdateParams): Action<boolean> =>
        doAction<boolean>(function*() {

            if (empty(changes)) return value(false);

            let query = params.query || {};

            changes = merge(changes, params.changes || {});

            let success = yield fork(model.update(id, flatten(changes), query));

            return value(success);

        });

/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the GetParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export const runGet =
    <T extends Object>(
        model: Model<T>,
        id: Id,
        params: GetParams): Action<Maybe<T>> =>
        doAction<Maybe<T>>(function*() {

            let query = params.query || {};

            let projection = merge({ _id: 0 }, params.fields || {});

            let maybeData =
                yield fork(model.get(id, query, { projection }));

            return value(maybeData.map((data: T) => ({ data })));

        });

/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via the RemoveParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export const runRemove =
    <T extends Object>(
        model: Model<T>,
        id: Id,
        params: RemoveParams): Action<boolean> =>
        doAction<boolean>(function*() {

            let { query } = { query: params.query || {} };

            let yes = yield fork(model.remove(id, query));

            return value(yes);

        });
