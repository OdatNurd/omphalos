---
title: omphalos.event.formPostSave
sidebar:
  label: formPostSave
  badge:
    variant: tip
    text: Client
---

```js
omphalos.event.formPostSave((payload) => {
  omphalos.log.debug(`form ${payload.formName} has being saved`);
})
```

:::caution[Client only]
This item is only present in the API object in [[guide.panels]] and
[[guide.graphics]]; it is not present in the API that is given to
[[guide.extensions]].
:::

This event is raised by a call to [[omphalos.form.save()]] to save a form to
storage. The event invokes after the save is complete, and has the following
payload:

```js
{
  formName: "string",
  form: "HTMLFormElement",
  data: {
    meta: "object", // Key-value pairs of standard form fields (serialized together)
    vars: "object"  // Key-value pairs of fields bound to global Skepsis variables via 'data-var'
  }
}
```

Invoking this function is equivalent to a call to [[omphalos.event.on()]], and
thus returns a function you can use to cancel the event listener registration
as needed.
