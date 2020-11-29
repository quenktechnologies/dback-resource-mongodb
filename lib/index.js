"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRemove = exports.runGet = exports.runUpdate = exports.runSearch = exports.runCreate = exports.BaseResource = exports.ERR_NO_QUERY = exports.ERR_PAYLOAD_INVALID = exports.KEY_REMOVE_PARAMS = exports.KEY_GET_PARAMS = exports.KEY_UPDATE_PARAMS = exports.KEY_SEARCH_PARAMS = exports.KEY_CREATE_ID = void 0;
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const type_1 = require("@quenk/noni/lib/data/type");
const api_1 = require("@quenk/tendril/lib/app/api");
const control_1 = require("@quenk/tendril/lib/app/api/control");
const pool_1 = require("@quenk/tendril/lib/app/api/pool");
const response_1 = require("@quenk/tendril/lib/app/api/response");
const response_2 = require("@quenk/tendril/lib/app/api/response");
const defaultSearchParams = { page: 1, limit: 1000 * 1000, query: {}, sort: {}, fields: {} };
exports.KEY_CREATE_ID = 'resource.mongodb.create.id';
exports.KEY_SEARCH_PARAMS = 'resource.mongodb.search.params';
exports.KEY_UPDATE_PARAMS = 'resource.mongodb.update.params';
exports.KEY_GET_PARAMS = 'resource.mongodb.search.params';
exports.KEY_REMOVE_PARAMS = 'resource.mongodb.remove.params';
exports.ERR_PAYLOAD_INVALID = 'payload invalid';
exports.ERR_NO_QUERY = 'no query parameters detected';
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
class BaseResource {
    constructor(conn = 'main') {
        this.conn = conn;
    }
    /**
     * before is a filter that is executed before each of the CSUGR
     * methods.
     *
     * It can be overriden to execute other middleware.
     */
    before(r) {
        return control_1.value(r);
    }
    /**
     * beforeCreate is executed before create().
     */
    beforeCreate(r) {
        return control_1.value(r);
    }
    /**
     * beforeSearch is executed before search().
     */
    beforeSearch(r) {
        return control_1.value(r);
    }
    /**
     * beforeUpdate is executed before update().
     */
    beforeUpdate(r) {
        return control_1.value(r);
    }
    /**
     * beforeGet is executed before get().
     */
    beforeGet(r) {
        return control_1.value(r);
    }
    /**
     * beforeRemove is executed before remove().
     */
    beforeRemove(r) {
        return control_1.value(r);
    }
    create(r) {
        let that = this;
        return api_1.doAction(function* () {
            if (!type_1.isObject(r.body))
                return response_1.conflict({ error: exports.ERR_PAYLOAD_INVALID });
            r = yield that.before(r);
            r = yield that.beforeCreate(r);
            let db = yield pool_1.checkout(that.conn);
            let model = that.getModel(db);
            let id = yield exports.runCreate(model, r.body);
            r.prs.set(exports.KEY_CREATE_ID, id);
            yield response_1.created({ id });
            yield that.after(r);
            return that.afterCreate(r);
        });
    }
    search(r) {
        let that = this;
        return api_1.doAction(function* () {
            let mparams = r.prs.get(exports.KEY_SEARCH_PARAMS);
            if (mparams.isNothing())
                return response_1.badRequest({ error: exports.ERR_NO_QUERY });
            let params = mparams.get();
            r = yield that.before(r);
            r = yield that.beforeSearch(r);
            let db = yield pool_1.checkout(that.conn);
            let model = that.getModel(db);
            let result = yield exports.runSearch(model, params);
            yield (result.data.length > 0) ? response_1.ok(result) : response_2.noContent();
            yield that.after(r);
            return that.afterSearch(r);
        });
    }
    update(r) {
        let that = this;
        return api_1.doAction(function* () {
            if (!type_1.isObject(r.body))
                return response_1.conflict({ error: exports.ERR_PAYLOAD_INVALID });
            if (!r.params.id)
                return response_2.notFound();
            r = yield that.before(r);
            r = yield that.beforeUpdate(r);
            let extraParams = r.prs.getOrElse(exports.KEY_UPDATE_PARAMS, { query: {}, changes: {} });
            let db = yield pool_1.checkout(that.conn);
            let model = that.getModel(db);
            let yes = yield exports.runUpdate(model, r.params.id, r.body, extraParams);
            yield yes ? response_1.ok() : response_2.notFound();
            yield that.after(r);
            return that.afterUpdate(r);
        });
    }
    get(r) {
        let that = this;
        return api_1.doAction(function* () {
            if (!r.params.id)
                return response_2.notFound();
            r = yield that.before(r);
            r = yield that.beforeGet(r);
            let params = r.prs.getOrElse(exports.KEY_GET_PARAMS, {
                query: {},
                fields: {},
            });
            let db = yield pool_1.checkout(that.conn);
            let model = that.getModel(db);
            let mdoc = yield exports.runGet(model, r.params.id, params);
            yield mdoc.isJust() ? response_1.ok(mdoc.get()) : response_2.notFound();
            yield that.after(r);
            return that.afterGet(r);
        });
    }
    remove(r) {
        let that = this;
        return api_1.doAction(function* () {
            if (!r.params.id)
                return response_2.notFound();
            r = yield that.before(r);
            r = yield that.beforeRemove(r);
            let params = r.prs.getOrElse(exports.KEY_REMOVE_PARAMS, {
                query: {},
            });
            let db = yield pool_1.checkout(that.conn);
            let model = that.getModel(db);
            let yes = yield exports.runRemove(model, r.params.id, params);
            yield yes ? response_1.ok() : response_2.notFound();
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
    after(_) {
        return control_1.noop();
    }
    /**
     * afterCreate is executed after [[create]] sends a response..
     */
    afterCreate(_) {
        return control_1.noop();
    }
    /**
     * afterSearch is executed after [[search]] sends a response.
     */
    afterSearch(_) {
        return control_1.noop();
    }
    /**
     * afterUpdate is executed after [[update]] sends a response.
     */
    afterUpdate(_) {
        return control_1.noop();
    }
    /**
     * afterGet is executed after [[get]] sends a response.
     */
    afterGet(_) {
        return control_1.noop();
    }
    /**
     * afterRemove is executed after [[remove]] sends a response.
     */
    afterRemove(_) {
        return control_1.noop();
    }
}
exports.BaseResource = BaseResource;
/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runCreate = (model, data) => api_1.doAction(function* () {
    return control_1.value(yield control_1.fork(model.create(data)));
});
exports.runCreate = runCreate;
/**
 * runSearch for documents in the database that match the specified
 * SearchParams.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runSearch = (model, params) => api_1.doAction(function* () {
    let { query, page, limit, sort, fields } = {
        query: params.query || {},
        page: params.page || defaultSearchParams.page,
        limit: params.limit || defaultSearchParams.limit,
        sort: params.sort || defaultSearchParams.sort,
        fields: params.fields || defaultSearchParams.fields
    };
    let n = yield control_1.fork(model.count(query));
    let pageCount = Math.ceil(n / limit);
    //adjust page value so first page will skip 0 records
    page = page - 1;
    let current = ((page < 0) || (pageCount === 0)) ? 0 :
        (page >= pageCount) ? pageCount - 1 :
            page;
    let skip = current * limit;
    let o = { skip, limit, sort, projection: fields };
    let data = yield control_1.fork(model.search(query, o));
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
    return control_1.value(payload);
});
exports.runSearch = runSearch;
/**
 * runUpdate updates a single document by id.
 *
 * The UpdateParams may be specified to add further details to the operation.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runUpdate = (model, id, changes, params) => api_1.doAction(function* () {
    if (record_1.empty(changes))
        return control_1.value(false);
    let query = params.query || {};
    changes = record_1.merge(changes, params.changes || {});
    let success = yield control_1.fork(model.update(id, path_1.flatten(changes), query));
    return control_1.value(success);
});
exports.runUpdate = runUpdate;
/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the GetParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runGet = (model, id, params) => api_1.doAction(function* () {
    let query = params.query || {};
    let projection = record_1.merge({ _id: 0 }, params.fields || {});
    let maybeData = yield control_1.fork(model.get(id, query, { projection }));
    return control_1.value(maybeData.map((data) => ({ data })));
});
exports.runGet = runGet;
/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via the RemoveParams parameter.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runRemove = (model, id, params) => api_1.doAction(function* () {
    let { query } = { query: params.query || {} };
    let yes = yield control_1.fork(model.remove(id, query));
    return control_1.value(yes);
});
exports.runRemove = runRemove;
//# sourceMappingURL=index.js.map