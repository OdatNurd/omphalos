---
title: omphalos.onEvent
sidebar:
  label: onEvent
---

```js
function omphalos.onEvent(event, listener)
function omphalos.onEvent(event, bundle, listener)

// also known as:
function omphalos.listenFor(event, listener)
function omphalos.listenFor(event, bundle, listener)
```

This function is a thin wrapper around [omphalos.listenFor](/api/omphalos/listenfor)
with a name that aids in readability when the messages being sent are intended
to be more event than command related.
