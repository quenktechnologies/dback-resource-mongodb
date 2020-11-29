# Tendril Changelog

## [1.2.2] - 2020-11-29
### Changed
 - You now need to specify a connection id to `BaseResource`. It will take care
   of checking the db connection out of the pool.

## [1.2.1] - 2020-11-28

### Removed
- The `abort()` method is gone. Use the API from tendril instead.

## [1.2.0] - 2020-11-28

### Changed
- API functions are now methods.
- HookResult is gone, do early exists via abort()

### Added
- This file!
- Tests for each endpoint.
