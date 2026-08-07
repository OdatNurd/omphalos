---
title: bundleVars.on
sidebar:
  label: on
---

```js
function omphalos.bundleVars.on(key, callback);
```

```js
function callback(newValue, oldValue, key);
```

This function registers a callback to be invoked every time the value
of the specified variable changes, such as through
[omphalos.bundleVars.set](/api/omphalos/bundlevars/set).

The return value is an `unlisten` function that can be used to cancel the
listener.
