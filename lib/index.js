"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRemove = exports.runGet = exports.runUpdate = exports.runSearch = exports.runCreate = exports.BaseResource = exports.DefaultParamsFactory = exports.ERR_NO_QUERY = exports.ERR_PAYLOAD_INVALID = exports.KEY_REMOVE_PARAMS = exports.KEY_GET_PARAMS = exports.KEY_UPDATE_PARAMS = exports.KEY_SEARCH_PARAMS = exports.KEY_CREATE_ID = void 0;
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const type_1 = require("@quenk/noni/lib/data/type");
const api_1 = require("@quenk/tendril/lib/app/api");
const control_1 = require("@quenk/tendril/lib/app/api/control");
const pool_1 = require("@quenk/tendril/lib/app/api/pool");
const response_1 = require("@quenk/tendril/lib/app/api/response");
const response_2 = require("@quenk/tendril/lib/app/api/response");
const defaults = {
    search: { page: 1, limit: 5000, query: {}, sort: {}, fields: {} },
    update: { query: {}, changes: {} },
    get: { query: {}, fields: {} },
    remove: { query: {} }
};
exports.KEY_CREATE_ID = 'resource.mongodb.create.id';
exports.KEY_SEARCH_PARAMS = 'resource.mongodb.search.params';
exports.KEY_UPDATE_PARAMS = 'resource.mongodb.update.params';
exports.KEY_GET_PARAMS = 'resource.mongodb.search.params';
exports.KEY_REMOVE_PARAMS = 'resource.mongodb.remove.params';
exports.ERR_PAYLOAD_INVALID = 'payload invalid';
exports.ERR_NO_QUERY = 'no query parameters detected';
/**
 * DefaultParamsFactory provides params from the defaults this module ships
 * with.
 *
 * These are ok for testing and development but in production this class should
 * probably not be used. Especially in the case of searches.
 */
class DefaultParamsFactory {
    /**
     * search provides the parameters for a search.
     */
    search(_) {
        return defaults.search;
    }
    /**
     * update provides the parameters for an update.
     */
    update(_) {
        return defaults.update;
    }
    /**
     * get provides the parameters for a get.
     */
    get(_) {
        return defaults.get;
    }
    /**
     * remove provides the parameters for a remove.
     */
    remove(_) {
        return defaults.remove;
    }
}
exports.DefaultParamsFactory = DefaultParamsFactory;
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
        /**
         * params provides required and optional parameters for each of the CSUGR
         * operations.
         */
        this.params = new DefaultParamsFactory();
    }
    /**
     * before is a filter that is executed before each of the CSUGR
     * methods.
     *
     * It can be overriden to execute other middleware.
     */
    before(r) {
        return (0, control_1.value)(r);
    }
    /**
     * beforeCreate is executed before create().
     */
    beforeCreate(r) {
        return (0, control_1.value)(r);
    }
    /**
     * beforeSearch is executed before search().
     */
    beforeSearch(r) {
        return (0, control_1.value)(r);
    }
    /**
     * beforeUpdate is executed before update().
     */
    beforeUpdate(r) {
        return (0, control_1.value)(r);
    }
    /**
     * beforeGet is executed before get().
     */
    beforeGet(r) {
        return (0, control_1.value)(r);
    }
    /**
     * beforeRemove is executed before remove().
     */
    beforeRemove(r) {
        return (0, control_1.value)(r);
    }
    create(r) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            r = yield that.before(r);
            r = yield that.beforeCreate(r);
            if (!(0, type_1.isObject)(r.body))
                return (0, response_1.conflict)({ error: exports.ERR_PAYLOAD_INVALID });
            let db = yield (0, pool_1.checkout)(that.conn);
            let model = that.getModel(db);
            let id = yield (0, exports.runCreate)(model, r.body);
            r.prs.set(exports.KEY_CREATE_ID, id);
            yield (0, response_1.created)({ data: { id } });
            yield that.after(r);
            return that.afterCreate(r);
        });
    }
    search(r) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            r = yield that.before(r);
            r = yield that.beforeSearch(r);
            let params = that.params.search(r);
            let db = yield (0, pool_1.checkout)(that.conn);
            let model = that.getModel(db);
            let result = yield (0, exports.runSearch)(model, params);
            yield (result.data.length > 0) ? (0, response_1.ok)(result) : (0, response_2.noContent)();
            yield that.after(r);
            return that.afterSearch(r);
        });
    }
    update(r) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            r = yield that.before(r);
            r = yield that.beforeUpdate(r);
            if (!(0, type_1.isObject)(r.body))
                return (0, response_1.conflict)({ error: exports.ERR_PAYLOAD_INVALID });
            if (!r.params.id)
                return (0, response_2.notFound)();
            let extraParams = that.params.update(r);
            let db = yield (0, pool_1.checkout)(that.conn);
            let model = that.getModel(db);
            let yes = yield (0, exports.runUpdate)(model, r.params.id, r.body, extraParams);
            yield yes ? (0, response_1.ok)() : (0, response_2.notFound)();
            yield that.after(r);
            return that.afterUpdate(r);
        });
    }
    get(r) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            r = yield that.before(r);
            r = yield that.beforeGet(r);
            if (!r.params.id)
                return (0, response_2.notFound)();
            let params = that.params.get(r);
            let db = yield (0, pool_1.checkout)(that.conn);
            let model = that.getModel(db);
            let mdoc = yield (0, exports.runGet)(model, r.params.id, params);
            yield mdoc.isJust() ? (0, response_1.ok)(mdoc.get()) : (0, response_2.notFound)();
            yield that.after(r);
            return that.afterGet(r);
        });
    }
    remove(r) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            r = yield that.before(r);
            r = yield that.beforeRemove(r);
            if (!r.params.id)
                return (0, response_2.notFound)();
            let params = that.remove(r);
            let db = yield (0, pool_1.checkout)(that.conn);
            let model = that.getModel(db);
            let yes = yield (0, exports.runRemove)(model, r.params.id, params);
            yield yes ? (0, response_1.ok)() : (0, response_2.notFound)();
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
        return (0, control_1.noop)();
    }
    /**
     * afterCreate is executed after [[create]] sends a response..
     */
    afterCreate(_) {
        return (0, control_1.noop)();
    }
    /**
     * afterSearch is executed after [[search]] sends a response.
     */
    afterSearch(_) {
        return (0, control_1.noop)();
    }
    /**
     * afterUpdate is executed after [[update]] sends a response.
     */
    afterUpdate(_) {
        return (0, control_1.noop)();
    }
    /**
     * afterGet is executed after [[get]] sends a response.
     */
    afterGet(_) {
        return (0, control_1.noop)();
    }
    /**
     * afterRemove is executed after [[remove]] sends a response.
     */
    afterRemove(_) {
        return (0, control_1.noop)();
    }
}
exports.BaseResource = BaseResource;
/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runCreate = (model, data) => (0, api_1.doAction)(function* () {
    return (0, control_1.value)(yield (0, control_1.fork)(model.create(data)));
});
exports.runCreate = runCreate;
/**
 * runSearch for documents in the database that match the specified
 * SearchParams.
 *
 * It is important the data supplied to this function is properly validated
 * or bad things can happen.
 */
const runSearch = (model, params) => (0, api_1.doAction)(function* () {
    let { query, page, limit, sort, fields } = {
        query: params.query || {},
        page: params.page || defaults.search.page,
        limit: params.limit || defaults.search.limit,
        sort: params.sort || defaults.search.sort,
        fields: params.fields || defaults.search.fields
    };
    let n = yield (0, control_1.fork)(model.count(query));
    let pageCount = Math.ceil(n / limit);
    //adjust page value so first page will skip 0 records
    page = page - 1;
    let current = ((page < 0) || (pageCount === 0)) ? 0 :
        (page >= pageCount) ? pageCount - 1 :
            page;
    let skip = current * limit;
    let o = { skip, limit, sort, projection: fields };
    let data = yield (0, control_1.fork)(model.search(query, o));
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
    return (0, control_1.value)(payload);
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
const runUpdate = (model, id, changes, params) => (0, api_1.doAction)(function* () {
    if ((0, record_1.empty)(changes))
        return (0, control_1.value)(false);
    let query = params.query || {};
    changes = (0, record_1.merge)(changes, params.changes || {});
    let success = yield (0, control_1.fork)(model.update(id, (0, path_1.flatten)(changes), query));
    return (0, control_1.value)(success);
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
const runGet = (model, id, params) => (0, api_1.doAction)(function* () {
    let query = params.query || {};
    let projection = (0, record_1.merge)({ _id: 0 }, params.fields || {});
    let maybeData = yield (0, control_1.fork)(model.get(id, query, { projection }));
    return (0, control_1.value)(maybeData.map((data) => ({ data })));
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
const runRemove = (model, id, params) => (0, api_1.doAction)(function* () {
    let { query } = { query: params.query || {} };
    let yes = yield (0, control_1.fork)(model.remove(id, query));
    return (0, control_1.value)(yes);
});
exports.runRemove = runRemove;
//# sourceMappingURL=index.js.map