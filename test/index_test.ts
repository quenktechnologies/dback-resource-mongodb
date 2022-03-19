import { assert } from '@quenk/test/lib/assert';
import { Mock } from '@quenk/test/lib/mock';

import {
    toPromise,
    doFuture,
    attempt,
    pure,
    Future
} from '@quenk/noni/lib/control/monad/future';
import { pure as freePure } from '@quenk/noni/lib/control/monad/free';
import { merge } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Type } from '@quenk/noni/lib/data/type';
import { just, nothing, Maybe } from '@quenk/noni/lib/data/maybe';

import { JoinRef, Id } from '@quenk/dback-model-mongodb';

import { Request } from '@quenk/tendril/lib/app/api/request';
import { value, noop } from '@quenk/tendril/lib/app/api/control';

import { BaseResource } from '../lib';

class MockModel {

    database = <Type>{};

    collection = <Type>{};

    id = 'test';

    refs: JoinRef[] = [];

    MOCK = new Mock();

    create(data: Object): Future<Id> {

        return this.MOCK.invoke('create', [data], pure(<Id>1));

    }

    createAll(data: Object[]): Future<Id[]> {

        return this.MOCK.invoke('createAll', [data], pure(<Id[]>[]));

    }

    search(filter: object, opts: object = {}): Future<Object[]> {

        return this.MOCK.invoke('search', [filter, opts], pure(<Object[]>[]));

    }

    update(id: Id, changes: object, qry?: object,
        opts: object = {}): Future<boolean> {

        return this.MOCK.invoke('update', [id, changes, qry, opts],
            pure(<boolean>true));

    }

    updateAll(qry: object, changes: object, opts: object = {}): Future<number> {

        return this.MOCK.invoke('updateAll', [changes, qry, opts], pure(1));

    }

    get(id: Id, qry?: object, opts: object = {}): Future<Maybe<Object>> {

        return this.MOCK.invoke('get', [id, qry, opts], pure(nothing()));

    }

    remove(id: Id, qry?: object, opts: object = {}): Future<boolean> {

        return this.MOCK.invoke('remove', [id, qry, opts],
            pure(<boolean>true));

    }

    removeAll(qry: object, opts: object = {}): Future<number> {

        return this.MOCK.invoke('removeAll', [qry, opts], pure(1));

    }

    count(qry: object): Future<number> {

        return this.MOCK.invoke('count', [qry], pure(1));

    }

    aggregate(pipeline: object[], opts: object = {}): Future<Object[]> {

        return this.MOCK.invoke('aggregate', [pipeline, opts],
            pure(<Object[]>[]));

    }

}

class TestResource extends BaseResource<Object> {

    constructor(public model: MockModel) { super(); }

    MOCK = new Mock();

    getModel() {

        return <Type>this.model;

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

    after(r: Request) {

        return this.MOCK.invoke('after', [r], noop());

    }

    afterCreate(r: Request) {

        return this.MOCK.invoke('afterCreate', [r], noop());

    }

    afterSearch(r: Request) {

        return this.MOCK.invoke('afterSearch', [r], noop());

    }

    afterUpdate(r: Request) {

        return this.MOCK.invoke('afterUpdate', [r], noop());

    }

    afterGet(r: Request) {

        return this.MOCK.invoke('afterGet', [r], noop());

    }

    afterRemove(r: Request) {

        return this.MOCK.invoke('afterRemove', [r], noop());

    }

}

const getContext = (req: object): Type => ({

    module: {

        app: {

            pool: {

                MOCK: new Mock(),

                get(id: string) {

                    return this.MOCK.invoke('get', [id], just({

                        checkout() {

                            return pure({});
                        }

                    }));
                }
            }
        }
    },

    request: merge({

        prs: {

            MOCK: new Mock(),

            set(key: string, value: Type) {

                return this.MOCK.invoke('set', [key, value], this);

            },

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

    filters: [],

    abort() {

        this.filters = [];
        return pure(freePure(<Type>undefined));

    }

});

describe('resource', () => {

    describe('BaseResource', () => {

        describe('create', () => {

            it('should create new records', () =>
                toPromise(doFuture<undefined>(function*() {

                    let ctx = getContext({ body: { name: 'Chippy' } });

                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('create', pure(1));

                    let action = ctl.create(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [201])
                        ).true();

                        assert(
                            ctx
                                .response
                                .MOCK
                                .wasCalledWithDeep('send', [{ data: { id: 1 } }])
                        ).true();

                        assert(
                            ctx
                                .request
                                .prs
                                .MOCK
                                .wasCalled('set')).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'create',
                            'before',
                            'beforeCreate',
                            'after',
                            'afterCreate'
                        ]);

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalledWithDeep('create', [ctx.request.body])
                        ).true();

                    });

                    return pure(undefined);

                })));

            it('should fail if the request body is not an object', () =>
                toPromise(doFuture<undefined>(function*() {

                    let ctx = getContext({});
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('create', pure(1));

                    let action = ctl.create(<Type>{});

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [409])
                        ).true();

                        assert(ctl.MOCK.wasCalled('before')).true();
                        assert(ctl.MOCK.wasCalled('beforeCreate')).true();
                        assert(ctl
                            .model
                            .MOCK
                            .wasCalled('create')).false();

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

                    ctl.params.search = () => qryParams;
                    ctl.model.MOCK.setReturnValue('count', pure(8));
                    ctl.model.MOCK.setReturnValue('search', pure([{}, {}]));

                    let action = ctl.search(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

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

                    ctl.params.search = () => qryParams;
                    ctl.model.MOCK.setReturnValue('count', pure(0));
                    ctl.model.MOCK.setReturnValue('search', pure([]));

                    let action = ctl.search(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

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

            it('should not fail if default ParamsFactory used', () =>
                toPromise(doFuture<undefined>(function*() {

                    let ctx = getContext({});
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('count', pure(8));
                    ctl.model.MOCK.setReturnValue('search', pure([{}, {}]));

                    let action = ctl.search(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(ctl.MOCK.wasCalled('before')).true();

                        assert(ctl.MOCK.wasCalled('beforeSearch')).true();

                        assert(ctl.model.MOCK.wasCalled('count')).true();

                        assert(ctl.model.MOCK.wasCalled('search')).true();

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [200])
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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'update',
                            'before',
                            'beforeUpdate',
                            'after',
                            'afterUpdate'
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

            it('should source additional parameters from installed ParamsFactory',
                () =>
                    toPromise(doFuture<undefined>(function*() {

                        let req = { params: { id: 1 }, body: { id: 2 } };
                        let ctx = getContext(req);
                        let ctl = new TestResource(new MockModel());

                        let qryParams = {

                            query: { name: 'Patrick' },

                            changes: { active: false }

                        };

                        ctl.params.update = () => qryParams;

                        ctl.model.MOCK.setReturnValue('update', pure(true));

                        let action = ctl.update(ctx.request);

                        yield action.foldM(() => pure(<void>undefined),
                            n => n.exec(ctx));

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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

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

            it('should fail if the request body is not an object', () =>
                toPromise(doFuture<undefined>(function*() {

                    let ctx = getContext({});
                    let ctl = new TestResource(new MockModel());

                    ctl.model.MOCK.setReturnValue('update', pure(true));

                    let action = ctl.update(<Type>{});

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWithDeep('status', [409])
                        ).true();

                        assert(ctl.MOCK.wasCalled('before')).true();

                        assert(ctl.MOCK.wasCalled('beforeUpdate')).true();

                        assert(ctl
                            .model
                            .MOCK
                            .wasCalled('update')).false();

                    });

                    return pure(undefined);

                })));

            it('should not throw if params.id is missing', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: {}, body: { id: 2 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());
                    let action = ctl.update(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalled('update')).false();

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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'get',
                            'before',
                            'beforeGet',
                            'after',
                            'afterGet'
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

            it('should source additional parameters from installed ParamsFactory',
                () =>
                    toPromise(doFuture<undefined>(function*() {

                        let req = { params: { id: 1 } };
                        let ctx = getContext(req);
                        let ctl = new TestResource(new MockModel());

                        let qryParams = {

                            query: { name: 'Chippy' },

                            fields: { id: 1 }

                        };

                        ctl.params.get = () => qryParams;

                        ctl.model.MOCK.setReturnValue('get', pure(just({ id: 1 })));

                        let action = ctl.get(ctx.request);

                        yield action.foldM(() => pure(<void>undefined),
                            n => n.exec(ctx));

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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

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

            it('should not throw if params.id is missing', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: {}, body: { id: 2 } };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());
                    let action = ctl.get(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalled('get')).false();

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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [200])
                        ).true();

                        assert(ctl.MOCK.getCalledList()).equate([
                            'remove',
                            'before',
                            'beforeRemove',
                            'after',
                            'afterRemove'
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

            it('should source additional parameters from installed ParamsFactory',
                () =>
                    toPromise(doFuture<undefined>(function*() {

                        let req = { params: { id: 1 } };
                        let ctx = getContext(req);
                        let ctl = new TestResource(new MockModel());

                        let qryParams = {

                            query: { name: 'Adom' },

                        };

                        ctl.params.remove = () => qryParams;

                        ctl.model.MOCK.setReturnValue('remove', pure(true));

                        let action = ctl.remove(ctx.request);

                        yield action.foldM(() => pure(<void>undefined),
                            n => n.exec(ctx));

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

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

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

            it('should not throw if params.id is missing', () =>
                toPromise(doFuture<undefined>(function*() {

                    let req = { params: {} };
                    let ctx = getContext(req);
                    let ctl = new TestResource(new MockModel());
                    let action = ctl.get(ctx.request);

                    yield action.foldM(() => pure(<void>undefined),
                        n => n.exec(ctx));

                    yield attempt(() => {

                        assert(
                            ctx.response.MOCK.wasCalledWith('status', [404])
                        ).true();

                        assert(
                            ctl
                                .model
                                .MOCK
                                .wasCalled('remove')).false();

                    });

                    return pure(undefined);

                })))
        })
    })
});
