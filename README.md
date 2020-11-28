# dback-resource-mongodb

## Introduction

This module provides a CSUGR API for controllers in `@quenk/tendril` 
applications.

## Installation

```sh
npm install --save-dev @quenk/dback-resource-mongodb
```

## Usage

Extend the `BaseResource` class to create your own implementation:

```typescript
import {BaseController} from '@quenk/dback-resource-mongodb';

export class MyController extends BaseResource {

  before(r:Request) {

    this.checkBody(r);
    return value(r);

  }

  create(r:Request) {

    if(this.isValid())
     doCreate(r.body);   

  }

}

```

NOTE: `BaseResource` does not validate the values sourced from the `Request`
object, it assumes they have been validated via middleware or filters or 
will be validated in the `before*()` hooks.

It is therefore important to validate any data coming from the client before
passing it to this module.
