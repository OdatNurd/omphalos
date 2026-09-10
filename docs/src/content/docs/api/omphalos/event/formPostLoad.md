---
title: omphalos.event.formPostLoad
sidebar:
  label: formPostLoad
  badge:
    variant: tip
    text: Client
---

```js
omphalos.event.formPostLoad((payload) => {
  omphalos.log.debug(`form ${payload.formName} finished loading);
})
```

[[macro api/clientOnly]]

This event is raised by a call to [[omphalos.form.load()]] to load a form from
storage. The event invokes after the load takes place, and has the following
payload:

```js
{
  formName: "string",
  form: "HTMLFormElement",
  data: {
    meta: "object",
    vars: "object"
  }
}
```

Invoking this function is equivalent to a call to [[omphalos.event.on()]], and
thus returns a function you can use to cancel the event listener registration
as needed.
