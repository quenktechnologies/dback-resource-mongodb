import { Object } from '@quenk/noni/lib/data/jsonx';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Action } from '@quenk/tendril/lib/app/api';
import { Request, Filter } from '@quenk/tendril/lib/app/api/request';
import { Model } from '@quenk/dback-model-mongodb';
/**
 * SearchKeys are the PRS keys used by Resource#search.
 */
export declare const enum SearchKeys {
    query = "resource.mongodb.search.query",
    page = "resource.mongodb.search.page",
    limit = "resource.mongodb.search.limit",
    sort = "resource.mongodb.search.sort",
    fields = "resource.mongodb.search.fields"
}
/**
 * UpdateKeys are the PRS keys used by Resource#update.
 */
export declare const enum UpdateKeys {
    query = "resource.mongodb.update.query"
}
/**
 * GetKeys are the PRS keys used by Resource#get.
 */
export declare const enum GetKeys {
    query = "resource.mongodb.get.query",
    fields = "resource.mongodb.get.fields"
}
/**
 * RemoveKeys are the PRS keys used by Resource#remove.
 */
export declare const enum RemoveKeys {
    query = "resource.mongodb.remove.query"
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
 * It houses the actual data as well as some additional meta information.
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
 * It provides a basic JSON enable CRUD interface for a collection in the
 * database. Extend BaseResource to benefit from the base implementation.
 * Additional methods can be added specific to your application's needs.
 */
export interface Resource<T extends Object> {
    /**
     * getModel provides an instance of the Resource's main Model.
     */
    getModel(): Action<Model<T>>;
    /**
     * create a new document in the Resource's collection.
     *
     * The document data is read from the request body.
     * A created response is sent with the id of the document once successful.
     */
    create: Filter<void>;
    /**
     * search for a document in the Resource's collection.
     *
     * The query parameters are built using the [[SearchKeys]] PRS keys.
     * A successful result with found documents sends a [[SearchResult]], if
     * there are no matches the NoContent response is sent.
     */
    search: Filter<void>;
    /**
     * update a single document in the Resource's collection.
     *
     * The document id is sourced from Request#params.id and the change data
     * from the request body.
     *
     * A successful update will result in an Success response whereas a
     * NotFound is sent if the update was not applied.
     */
    update: Filter<void>;
    /**
     * get a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id. A successful fetch
     * will respond with a Success with the document as body otherwise a
     * NotFound is sent.
     */
    get: Filter<void>;
    /**
     * remove a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.a
     * A successful delete will respond with a Success or NotFound if the
     * document was not found.
     */
    remove: Filter<void>;
}
/**
 * BaseResource provides the default Resource implementation.
 */
export declare abstract class BaseResource<T extends Object> implements Resource<T> {
    abstract getModel(): Action<Model<T>>;
    create: (r: Request) => Action<void>;
    search: (_: Request) => Action<void>;
    update: (r: Request) => Action<void>;
    get: (r: Request) => Action<void>;
    remove: (r: Request) => Action<void>;
}
/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * The data provided SHOULD be validated according to the application's own
 * rules.
 */
export declare const runCreate: <T extends Object>(model: any, data: T) => Action<any>;
/**
 * runSearch for documents in the database that match the specified query.
 *
 * [[SearchKeys]] can be used to further configure the executed query.
 */
export declare const runSearch: <T extends Object>(model: any, query: Object) => Action<SearchResult<T>>;
/**
 * runUpdate updates a single document by id using the provided changes.
 *
 * The operation will be carried out using the $set operator. The changes
 * should be validated by the application before passing to this function.
 * [[UpdateKeys]] can be set to customize the operation.
 */
export declare const runUpdate: <T extends Object>(model: any, id: any, changes: Object) => Action<boolean>;
/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the [[GetKeys]] PRS keys.
 */
export declare const runGet: <T extends Object>(model: any, id: any) => Action<Maybe<T>>;
/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via [[RemoveKeys]] PRS keys.
 */
export declare const runRemove: <T extends Object>(model: any, id: any) => Action<boolean>;
