---
title: omphalos.raiseEvent
sidebar:
  label: raiseEvent
---

```js
function omphalos.raiseEvent(event, data)

// also known as:
function omphalos.sendMessage(event, data)
```

This function is a thin wrapper around [omphalos.sendMessage](/api/omphalos/sendmessage)
with a name that aids in readability when the messages being sent are intended
to be more event than command related.
