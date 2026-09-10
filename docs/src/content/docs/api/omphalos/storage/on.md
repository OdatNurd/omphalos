---
title: storage.on
sidebar:
  label: on
---

```js
function omphalos.storage.on(key, (newValue, oldValue, key) => { ... });
```

[[macro storage/reservedKeys]]

This function registers a callback to be invoked every time the value of the
specified variable changes, such as through [[omphalos.storage.set()]].

The return value is an `unlisten` function that can be used to cancel the
listener.
