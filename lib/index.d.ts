import * as mongo from 'mongodb';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Action } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { Id, Model } from '@quenk/dback-model-mongodb';
export declare const KEY_CREATE_ID = "resource.mongodb.create.id";
export declare const KEY_SEARCH_PARAMS = "resource.mongodb.search.params";
export declare const KEY_UPDATE_PARAMS = "resource.mongodb.update.params";
export declare const KEY_GET_PARAMS = "resource.mongodb.search.params";
export declare const KEY_REMOVE_PARAMS = "resource.mongodb.remove.params";
export declare const ERR_PAYLOAD_INVALID = "payload invalid";
export declare const ERR_NO_QUERY = "no query parameters detected";
/**
 * SearchParams used in search query execution.
 */
export interface SearchParams {
    /**
     * query object used to filter documents.
     */
    query: Object;
    /**
     * page to begin retrieving documents.
     */
    page: number;
    /**
     * limit on documents to retreive.
     *
     * Paging is based on this number and not the total possible result.
     */
    limit: number;
    /**
     * sort object.
     */
    sort: Object;
    /**
     * fields to retrieve for each document.
     */
    fields: object;
}
/**
 * UpdateParams used in update operations.
 */
export interface UpdateParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;
    /**
     * changes to be made via the $set operation.
     *
     * This is in addition to the request body.
     */
    changes: Object;
}
/**
 * GetParams used in single result search operations.
 */
export interface GetParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;
    /**
     * fields to project on.
     */
    fields: object;
}
/**
 * RemoveParams used in remove operations.
 */
export interface RemoveParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;
}
/**
 * CurrentSection holds pagination information on the current page.
 */
export interface CurrentSection {
    /**
     * count of the current set.
     */
    count: number;
    /**
     * page number of the current set in the total result.
     */
    page: number;
    /**
     * limit indicates how many rows are allowed per page.
     */
    limit: number;
}
/**
 * TotalSection holds pagination information for the entire result.
 */
export interface TotalSection {
    /**
     * count of the entire result set.
     */
    count: number;
    /**
     * pages available for the entire result.
     */
    pages: number;
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
    data: T[];
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
            current: CurrentSection;
            /**
             * total section (the entire result).
             */
            total: TotalSection;
        };
    };
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
    create(r: Request): Action<void>;
    /**
     * search for a document in the Resource's collection.
     *
     * The query parameters are built using the [[KEY_SEARCH_PARAMS]] PRS keys.
     * A successful result with found documents sends a [[SearchResult]], if
     * there are no matches the [[NoContent]] response is sent.
     */
    search(r: Request): Action<void>;
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
    update(r: Request): Action<void>;
    /**
     * get a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.
     * Additional conditions can be specified via the [[KEY_GET_PARAMS]] PRS key.
     *
     * A successful fetch will respond with [[Ok]] with the document as body
     * otherwise [[NotFound]] is sent.
     */
    get(r: Request): Action<void>;
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
    remove(r: Request): Action<void>;
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
export declare abstract class BaseResource<T extends Object> implements Resource {
    conn: string;
    constructor(conn?: string);
    /**
     * getModel provides an instance of the Resource's main Model.
     */
    abstract getModel(db: mongo.Db): Model<T>;
    /**
     * before is a filter that is executed before each of the CSUGR
     * methods.
     *
     * It can be overriden to execute other middleware.
     */
    before(r: Request): Action<Request>;
    /**
     * beforeCreate is executed before create().
     */
    beforeCreate(r: Request): Action<Request>;
    /**
     * beforeSearch is executed before search().
     */
    beforeSearch(r: Request): Action<Request>;
    /**
     * beforeUpdate is executed before update().
     */
    beforeUpdate(r: Request): Action<Request>;
    /**
     * beforeGet is executed before get().
     */
    beforeGet(r: Request): Action<Request>;
    /**
     * beforeRemove is executed before remove().
     */
    beforeRemove(r: Request): Action<Request>;
    create(r: Request): Action<void>;
    search(r: Request): Action<void>;
    update(r: Request): Action<void>;
    get(r: Request): Action<void>;
    remove(r: Request): Action<void>;
    /**
     * after is a filter that is executed after each of the CSUGR
     * methods have responded to the client.
     *
     * It can be overriden to execute other middleware.
     */
    after(_: Request): Action<void>;
    /**
     * afterCreate is executed after [[create]] sends a response..
     */
    afterCreate(_: Request): Action<void>;
    /**
     * afterSearch is executed after [[search]] sends a response.
     */
    afterSearch(_: Request): Action<void>;
    /**
     * afterUpdate is executed after [[update]] sends a response.
     */
    afterUpdate(_: Request): Action<void>;
    /**
     * afterGet is executed after [[get]] sends a response.
     */
    afterGet(_: Request): Action<void>;
    /**
     * afterRemove is executed after [[remove]] sends a response.
     */
    afterRemove(_: Request): Action<void>;
}
/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export declare const runCreate: <T extends Object>(model: Model<T>, data: T) => Action<string | number>;
/**
 * runSearch for documents in the database that match the specified
 * SearchParams.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export declare const runSearch: <T extends Object>(model: Model<T>, params: SearchParams) => Action<SearchResult<T>>;
/**
 * runUpdate updates a single document by id.
 *
 * The UpdateParams may be specified to add further details to the operation.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export declare const runUpdate: <T extends Object>(model: Model<T>, id: Id, changes: Object, params: UpdateParams) => Action<boolean>;
/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the GetParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export declare const runGet: <T extends Object>(model: Model<T>, id: Id, params: GetParams) => Action<Maybe<T>>;
/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via the RemoveParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
export declare const runRemove: <T extends Object>(model: Model<T>, id: Id, params: RemoveParams) => Action<boolean>;
