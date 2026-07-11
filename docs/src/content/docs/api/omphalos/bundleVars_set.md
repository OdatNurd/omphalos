---
title: bundleVars.set
---

```js
function bundleVars.set(key, value);
```

Store the provided value into the persistent storage for this bundle under the
given `key`. If any value for that key already exists, it will be replaced with
the new value.

`value` can be any JSON compatible value, but cannot be `undefined`.
