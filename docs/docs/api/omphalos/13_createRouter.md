---
title: createRouter
---

```js
function createRouter()
```

:::warning Server only

This item is only present in the API object given to an `extension`; it is
not available in `panels` and `graphics`.

:::

Create and return back a new [express router][1] to allow your extension to
respond to any requests it may need to respond to, expose the routes of used
libraries, etc.

Example:

```js
    // Simple router test.
    const router = omphalos.createRouter();

    router.get('/my_custom_route', (req, res) => res.send('it worked!'))
    omphalos.mount(router);
```

 [1]: http://expressjs.com/en/api.html#express.router