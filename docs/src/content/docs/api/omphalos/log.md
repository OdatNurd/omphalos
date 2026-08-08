---
title: omphalos.log
sidebar:
  label: log
---

A handle to a bundle specific logger. This object has methods `info`, `debug`,
`warn`, `error` and `silly` to send output of varying levels.

The configuration specifies which levels get logged and which get ignored.

All logs are prefixed with the name of the bundle that generated them.

```js title="Sample Logs"
omphalos.log.info('this is an informational message');
omphalos.log.debug('this is a debug message');
omphalos.log.warn('this is a warning message');
omphalos.log.error('this is an error message');
omphalos.log.silly('this is a silly message');
```
