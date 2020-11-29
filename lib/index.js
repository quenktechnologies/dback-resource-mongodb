"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRemove = exports.runGet = exports.runUpdate = exports.runSearch = exports.runCreate = exports.BaseResource = exports.ERR_NO_QUERY = exports.ERR_PAYLOAD_INVALID = exports.KEY_REMOVE_PARAMS = exports.KEY_GET_PARAMS = exports.KEY_UPDATE_PARAMS = exports.KEY_SEARCH_PARAMS = void 0;
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const type_1 = require("@quenk/noni/lib/data/type");
const api_1 = require("@quenk/tendril/lib/app/api");
const control_1 = require("@quenk/tendril/lib/app/api/control");
const response_1 = require("@quenk/tendril/lib/app/api/response");
const response_2 = require("@quenk/tendril/lib/app/api/response");
const defaultSearchParams = { page: 1, limit: 1000 * 1000, query: {}, sort: {}, fields: {} };
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
 */
class BaseResource {
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
            let model = that.getModel();
            let id = yield exports.runCreate(model, r.body);
            return response_1.created({ id });
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
            let model = that.getModel();
            let result = yield exports.runSearch(model, params);
            if (result.data.length > 0)
                return response_1.ok(result);
            else
                return response_2.noContent();
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
            let model = that.getModel();
            let yes = yield exports.runUpdate(model, r.params.id, r.body, extraParams);
            return yes ? response_1.ok() : response_2.notFound();
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
            let model = that.getModel();
            let mdoc = yield exports.runGet(model, r.params.id, params);
            return mdoc.isJust() ? response_1.ok(mdoc.get()) : response_2.notFound();
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
            let model = that.getModel();
            let yes = yield exports.runRemove(model, r.params.id, params);
            return yes ? response_1.ok() : response_2.notFound();
        });
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