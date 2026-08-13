---
title: storage.on
sidebar:
  label: on
---

```js
function omphalos.storage.on(key, callback);
```

```js
function callback(newValue, oldValue, key);
```

This function registers a callback to be invoked every time the value of the
specified variable changes, such as through [[omphalos.storage.set()]].

The return value is an `unlisten` function that can be used to cancel the
listener.

:::caution[reserved names]
Storage keys that start with `__sys` are reserved by Omphalos for system values;
you should not use them in your own variables.
:::