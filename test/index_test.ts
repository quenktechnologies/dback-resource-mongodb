import * as http from 'http';
import * as express from 'express';

import { assert } from '@quenk/test/lib/assert';
import { Mock } from '@quenk/test/lib/mock';

import {
    toPromise,
    doFuture,
    attempt,
    pure,
    Future
} from '@quenk/noni/lib/control/monad/future';
import { merge } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Type } from '@quenk/noni/lib/data/type';
import { just, nothing, Maybe } from '@quenk/noni/lib/data/maybe';

import { JoinRef, Id } from '@quenk/dback-model-mongodb';

import { Request } from '@quenk/tendril/lib/app/api/request';
import { ok } from '@quenk/tendril/lib/app/api/response';
import { value } from '@quenk/tendril/lib/app/api/control';
import { Context, doAction } from '@quenk/tendril/lib/app/api';

import { BaseResource } from '../src';

class MockModel {

    database = <Type>{};

    collection = <Type>{};

    id = 'test';

    refs: JoinRef[] = [];

    MOCK = new Mock();

    create(data: Object): Future<Id> {

        return this.MOCK.invoke('create', [data], pure(1));

    }

    createAll(data: Object[]): Future<Id[]> {

        return this.MOCK.invoke('createAll', [data], pure([]));

    }

    search(filter: object, opts: object = {}): Future<Object[]> {

        return this.MOCK.invoke('search', [filter, opts], pure([]));

    }

    update(id: Id, changes: object, qry?: object,
        opts: object = {}): Future<boolean> {

        return this.MOCK.invoke('update', [id, changes, qry, opts], pure(true));

    }

    updateAll(qry: object, changes: object, opts: object = {}): Future<number> {

        return this.MOCK.invoke('updateAll', [changes, qry, opts], pure(1));

    }

    get(id: Id, qry?: object, opts: object = {}): Future<Maybe<Object>> {

        return this.MOCK.invoke('get', [id, qry, opts], pure(nothing()));

    }

    remove(id: Id, qry?: object, opts: object = {}): Future<boolean> {

        return this.MOCK.invoke('remove', [id, qry, opts], pure(true));

    }

    removeAll(qry: object, opts: object = {}): Future<number> {

        return this.MOCK.invoke('removeAll', [qry, opts], pure(1));

    }

    count(qry: object): Future<number> {

        return this.MOCK.invoke('count', [qry], pure(1));

    }

    aggregate(pipeline: object[], opts: object = {}): Future<Object[]> {

        return this.MOCK.invoke('aggregate', [pipeline, opts], pure([]));

    }

}

class TestResource extends BaseResource<Object> {

    constructor(public model: MockModel) { super(); }

    MOCK = new Mock();

    getModel() {

        return this.model;

    }

    before(r: Request) {

        return this.MOCK.invoke('before', [r], value(r));

    }

    beforeCreate(r: Request) {

        return this.MOCK.invoke('beforeCreate', [r], value(r));

    }

    beforeSearch(r: Request) {

        return this.MOCK.invoke('beforeSearch', [r], value(r));

    }

    beforeUpdate(r: Request) {

        return this.MOCK.invoke('beforeUpdate', [r], value(r));

    }

    beforeGet(r: Request) {

        return this.MOCK.invoke('beforeGet', [r], value(r));

    }

    beforeRemove(r: Request) {

        return this.MOCK.invoke('beforeRemove', [r], value(r));

    }

    create(r: Request) {

        this.MOCK.invoke('create', [r], undefined);
        return super.create(r);

    }

    search(r: Request) {

        this.MOCK.invoke('search', [r], undefined);
        return super.search(r);

    }

    update(r: Request) {

        this.MOCK.invoke('update', [r], undefined);
        return super.update(r);

    }

    get(r: Request) {

        this.MOCK.invoke('get', [r], undefined);
        return super.get(r);

    }

    remove(r: Request) {

        this.MOCK.invoke('remove', [r], undefined);
        return super.remove(r);

    }

}

const getContext = (req: object): Type => ({

    module: {},

    request: merge({

        prs: {

            MOCK: new Mock(),

            get(key: string) {

                return this.MOCK.invoke('get', [key], nothing());

            },

            getOrElse(key: string, alt: Type) {

                return this.MOCK.invoke('getOrElse', [key, alt], alt);

            }

        }

    }, req),

    response: {

        MOCK: new Mock(),

        status(code: number) {

            this.MOCK.invoke('status', [code], undefined);

        },

        send(value: Type) {

            this.MOCK.invoke('send', [value], undefined);

        },

        end() {

            this.MOCK.invoke('end', [], undefined);

        }

    },

    onError: () => { },

    filters: []

});

describe('resource', () => {

    describe('BaseResource', () => {

        describe('create', () => {

            it('should create new records', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = <Type>{ body: { name: 'Chippy' } };

                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('create', pure(1));

                    let action = ctl.create(req);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [201])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalledWithDeep('send', [{ id: 1 }])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'create',
                            'before',
                            'beforeCreate',
                        ]);

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('create', [req.body])
                        ).true();

                    });

                    return pure(undefined);

                })));
        });

        describe('search', () => {

            it('should return found records', () =>
                toPromise(doFuture<undefined>(function*() {

                    let qryParams = {

                        query: { name: 'Chippy' },

                        page: 3,

                        limit: 3,

                        sort: { name: 1 },

                        fields: { rank: 1 }

                    };

                    let expectedResult = {

                        data: [{}, {}],

                        meta: {

                            pagination: {

                                current: { count: 2, page: 3, limit: 3 },

                                total: { count: 8, pages: 3 }

                            }

                        }

                    };

                    let expectedOpts = {

                        skip: 6,

                        limit: 3,

                        sort: { name: 1 },

                        projection: { rank: 1 }

                    };

                    let ctx = getContext({});
                    let ctl = new TestResource(new MockModel());

                    ctx.request.prs.MOCK.setReturnValue('get', just(qryParams));

                    ctl.model.MOCK.setReturnValue('count', pure(8));
                    ctl.model.MOCK.setReturnValue('search', pure([{}, {}]));

                    let action = ctl.search(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [200])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalledWithDeep('send', [expectedResult])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('search', [
                                    qryParams.query,
                                    expectedOpts
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should send status 204 when no found records', () =>
                toPromise(doFuture<undefined>(function*() {

                    let qryParams = {

                        query: { name: 'Chippy' },

                        page: 3,

                        limit: 3,

                        sort: { name: 1 },

                        fields: { rank: 1 }

                    };

                    let ctx = getContext({});
                    let ctl = new TestResource(new MockModel());

                    ctx.request.prs.MOCK.setReturnValue('get', just(qryParams));

                    ctl.model.MOCK.setReturnValue('count', pure(0));
                    ctl.model.MOCK.setReturnValue('search', pure([]));

                    let action = ctl.search(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [204])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalled('send')
                        ).false();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalled('search')
                        ).true();

                    });

                    return pure(undefined);

                })))

        })

        describe('update', () => {

            it('should update the target record', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 }, body: { id: 2 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('update', pure(true));

                    let action = ctl.update(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'update',
                            'before',
                            'beforeUpdate',
                        ]);

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('update', [
                                    1,
                                    { id: 2 },
                                    {},
                                    {}
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should source additional parameters from prs', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 }, body: { id: 2 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    let qryParams = {

                        query: { name: 'Patrick' },

                        changes: { active: false }

                    };

                    ctx.request.prs.MOCK.setReturnValue('getOrElse', qryParams);

                    ctl.model.MOCK.setReturnValue('update', pure(true));

                    let action = ctl.update(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('update', [
                                    1,
                                    { id: 2, active: false },
                                    qryParams.query,
                                    {}
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should 404 if not found', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 }, body: { id: 2 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('update', pure(false));

                    let action = ctl.update(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalled('send')
                        ).false();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('update', [
                                    1,
                                    { id: 2 },
                                    {},
                                    {}
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))
        })

        describe('get', () => {

            it('should return the target record', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('get', pure(just({ id: 1 })));

                    let action = ctl.get(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'get',
                            'before',
                            'beforeGet',
                        ]);

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalledWithDeep('send', [{ data: { id: 1 } }])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('get', [
                                    1,
                                    {},
                                    { projection: { _id: 0 } }
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should source additional parameters from prs', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    let qryParams = {

                        query: { name: 'Chippy' },

                        fields: { id: 1 }

                    };

                    ctx.request.prs.MOCK.setReturnValue('getOrElse', qryParams);

                    ctl.model.MOCK.setReturnValue('get', pure(just({ id: 1 })));

                    let action = ctl.get(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalledWithDeep('send',
                                    [{ data: { id: 1 } }])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('get', [
                                    1,
                                    { name: 'Chippy' },
                                    { projection: { _id: 0, id: 1 } }
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should 404 if not found', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('get', pure(nothing()));

                    let action = ctl.get(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalled('send')
                        ).false();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('get', [
                                    1,
                                    {},
                                    { projection: { _id: 0 } }
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))
        })

        describe('remove', () => {

            it('should remove the target record', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('remove', pure(true));

                    let action = ctl.remove(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'remove',
                            'before',
                            'beforeRemove',
                        ]);

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('remove', [
                                    1,
                                    {},
                                    {}
                                ])
                        ).true();
                    });

                    return pure(undefined);

                })))

            it('should source additional parameters from prs', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    let qryParams = {

                        query: { name: 'Adom' },

                    };

                    ctx.request.prs.MOCK.setReturnValue('getOrElse', qryParams);

                    ctl.model.MOCK.setReturnValue('remove', pure(true));

                    let action = ctl.remove(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('remove', [
                                    1,
                                    qryParams.query,
                                    {}
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))

            it('should 404 if not found', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: { id: 1 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('remove', pure(false));

                    let action = ctl.remove(ctx.request);

                    yield action.foldM(() => pure(undefined), n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalled('send')
                        ).false();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('remove', [
                                    1,
                                    {},
                                    {}
                                ])
                        ).true();

                    });

                    return pure(undefined);

                })))
        })
    })
});
