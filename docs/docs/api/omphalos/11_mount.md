---
title: mount
---

```js
function mount(router)
```

:::warning Server only

This item is only present in the API object given to an `extension`; it is
not available in `panels` and `graphics`.

:::

Mount a router created by [createRouter](./createRouter) into the underlying
application.

Custom routers are mounted in the order that extensions are loaded.

Example:

```js
    // Simple router test.
    const router = omphalos.createRouter();

    router.get('/my_custom_route', (req, res) => res.send('it worked!'))
    omphalos.mount(router);
```

 [1]: http://expressjs.com/en/api.html#express.router