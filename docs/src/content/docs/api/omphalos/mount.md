---
title: omphalos.mount
sidebar:
  label: mount
  badge:
    variant: note
    text: Server
---

```js
function omphalos.mount(router)
```

:::caution[Server only]
This item is only present in the API object in [[guide.panels]] and
[[guide.graphics]]; it is not present in the API that is given to
[[guide.extensions]].
:::

Mount a router created by [[omphalos.createRouter()]] into the underlying
application.

Custom routers are mounted in the order that extensions are loaded.

Example:

```js title="Simple Router Test"
  const router = omphalos.createRouter();

  router.get('/my_custom_route', (req, res) => res.send('it worked!'))
  omphalos.mount(router);
```

 [1]: http://expressjs.com/en/api.html#express.router