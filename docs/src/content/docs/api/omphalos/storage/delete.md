---
title: storage.delete
sidebar:
  label: delete
---

```js
function omphalos.storage.delete(key);
```

Delete the value of the provided `key` from the persistent storage for this
bundle, if there is one.

it is not an error to try to delete a key that does not exist.
