---
title: omphalos.raiseEventToBundle
sidebar:
  label: raiseEventToBundle
---

```js
function omphalos.raiseEventToBundle(event, bundle, data)

// also known as:
function omphalos.sendMessageToBundle(event, bundle, data)
```

This function is a thin wrapper around [omphalos.sendMessage](/api/omphalos/sendmessagetobundle)
with a name that aids in readability when the messages being sent are intended
to be more event than command related.
