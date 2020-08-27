# dback-resource-mongodb

## About

This module provides tendril compatiable classes and types for creating basic
endpoints for CRUD operations.

## Installation

```sh
npm install --save-dev @quenk/dback-resource-mongodb
```

## Usage

Use of this module usually begins by extending the `BaseResource` class:

```typescript
import {BaseController} from '@quenk/dback-resource-mongodb';

export class MyController extends BaseResource {}

```

`MyController` now has simple create,search,update,get,remove methods.

NOTE: Proper middleware should be installed to prevent abuse, all these methods
do is the database operations, NOTHING ELSE!
