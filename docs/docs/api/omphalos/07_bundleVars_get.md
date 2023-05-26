---
title: bundleVars.get
---

```js
function bundleVars.get(key, defaultValue);
```

Fetch the value of the provided `key` from the persistent storage for this bundle
and return it. If there is currently no stored value for this key, the provided
`defaultValue`, if any, will be returned.

:::note Fetch entire storage

If this function is invoked with no `key` or `defaultValue`, the resulting
return will be the entire storage for the bundle as one large JSON object.

This will always return an object, though it may have no keys if there are
currently no items in storage for this bundle.
:::