"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRemove = exports.runGet = exports.runUpdate = exports.runSearch = exports.runCreate = exports.BaseResource = void 0;
const prs = require("@quenk/tendril/lib/app/api/storage/prs");
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const api_1 = require("@quenk/tendril/lib/app/api");
const control_1 = require("@quenk/tendril/lib/app/api/control");
const response_1 = require("@quenk/tendril/lib/app/api/response");
const response_2 = require("@quenk/tendril/lib/app/api/response");
const defaultSearchParams = { page: 1, limit: 1000 * 1000, query: {}, sort: {}, fields: {} };
const defaultUpdateParams = { query: {} };
const defaultGetParams = { query: {}, fields: {} };
const defaultRemoveParams = { query: {} };
/**
 * BaseResource provides the default Resource implementation.
 */
class BaseResource {
    constructor() {
        this.create = (req) => {
            let that = this;
            return api_1.doAction(function* () {
                let r = yield that.beforeCreate(yield that.before(req));
                let model = yield that.getModel();
                let id = yield exports.runCreate(model, r.body);
                return response_1.created({ id });
            });
        };
        this.search = (req) => {
            let that = this;
            return api_1.doAction(function* () {
                yield that.beforeSearch(yield that.before(req));
                let model = yield that.getModel();
                let mquery = yield prs.get("resource.mongodb.search.query" /* query */);
                if (mquery.isJust()) {
                    let result = yield exports.runSearch(model, mquery.get());
                    if (result.data.length > 0)
                        return response_1.ok(result);
                    else
                        return response_2.noContent();
                }
                else {
                    return response_1.badRequest();
                }
            });
        };
        this.update = (req) => {
            let that = this;
            return api_1.doAction(function* () {
                let r = yield that.beforeUpdate(yield that.before(req));
                let model = yield that.getModel();
                let yes = yield exports.runUpdate(model, r.params.id, r.body);
                return yes ? response_1.ok() : response_2.notFound();
            });
        };
        this.get = (req) => {
            let that = this;
            return api_1.doAction(function* () {
                let r = yield that.beforeGet(yield that.before(req));
                let model = yield that.getModel();
                let mdoc = yield exports.runGet(model, r.params.id);
                return mdoc.isJust() ? response_1.ok(mdoc.get()) : response_2.notFound();
            });
        };
        this.remove = (req) => {
            let that = this;
            return api_1.doAction(function* () {
                let r = yield that.beforeRemove(yield that.before(req));
                let model = yield that.getModel();
                let yes = yield exports.runRemove(model, r.params.id);
                return yes ? response_1.ok() : response_2.notFound();
            });
        };
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
}
exports.BaseResource = BaseResource;
/**
 * runCreate creates a new document in the provided Model's collection.
 *
 * The data provided SHOULD be validated according to the application's own
 * rules.
 */
exports.runCreate = (model, data) => api_1.doAction(function* () {
    return control_1.value(yield model.create(data));
});
/**
 * runSearch for documents in the database that match the specified query.
 *
 * [[SearchKeys]] can be used to further configure the executed query.
 */
exports.runSearch = (model, query) => api_1.doAction(function* () {
    let { page, limit, sort, fields } = {
        page: yield prs.getOrElse("resource.mongodb.search.page" /* page */, defaultSearchParams.page),
        limit: yield prs.getOrElse("resource.mongodb.search.limit" /* limit */, defaultSearchParams.limit),
        sort: yield prs.getOrElse("resource.mongodb.search.sort" /* sort */, defaultSearchParams.sort),
        fields: yield prs.getOrElse("resource.mongodb.search.fields" /* fields */, defaultSearchParams.fields)
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
                    count: pageCount,
                    pages: n
                }
            }
        }
    };
    return control_1.value(payload);
});
/**
 * runUpdate updates a single document by id using the provided changes.
 *
 * The operation will be carried out using the $set operator. The changes
 * should be validated by the application before passing to this function.
 * [[UpdateKeys]] can be set to customize the operation.
 */
exports.runUpdate = (model, id, changes) => api_1.doAction(function* () {
    if (record_1.empty(changes))
        return control_1.value(false);
    let { query } = {
        query: yield prs.getOrElse("resource.mongodb.update.query" /* query */, defaultUpdateParams.query),
    };
    let success = yield control_1.fork(model.update(id, path_1.flatten(changes), query));
    return control_1.value(success);
});
/**
 * runGet retrieves a single document given its id.
 *
 * Additional query parameters may be included using the [[GetKeys]] PRS keys.
 */
exports.runGet = (model, id) => api_1.doAction(function* () {
    let { query, fields } = {
        query: yield prs.getOrElse("resource.mongodb.get.query" /* query */, defaultGetParams.query),
        fields: yield prs.getOrElse("resource.mongodb.get.fields" /* fields */, defaultGetParams.fields)
    };
    let projection = record_1.merge({ _id: 0 }, fields);
    let maybeData = yield control_1.fork(model.get(id, query, { projection }));
    return control_1.value(maybeData);
});
/**
 * runRemove a single document by its key.
 *
 * Additional query parameters may be included via [[RemoveKeys]] PRS keys.
 */
exports.runRemove = (model, id) => api_1.doAction(function* () {
    let { query } = {
        query: yield prs.getOrElse("resource.mongodb.remove.query" /* query */, defaultRemoveParams.query),
    };
    let yes = yield control_1.fork(model.remove(id, query));
    return control_1.value(yes);
});
//# sourceMappingURL=index.js.map