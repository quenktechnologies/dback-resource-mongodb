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

NOTE: The methods above simply make the appropriate database calls an make NO
attempt to validate the data provided. The `before*()` hooks should be used 
to ensure data sent to the database is set and meets the right requirements.
