---
title: omphalos.event.formPreSave
sidebar:
  label: formPreSave
  badge:
    variant: tip
    text: Client
---

```js
omphalos.event.formPreSave((payload) => {
  omphalos.log.debug(`form ${payload.formName} is being saved`);
})
```

:::caution[Client only]
This item is only present in the API object in [[panels]] and [[graphics]]; it is
not present in the API that is given to [[extensions]].
:::

This event is raised by a call to [[omphalos.form.save()]] to save a form to
storage. The event invokes prior to the save taking place, and has the
following payload:

```js
{
  formName: "string",      // The form's name or id attribute
  form: "HTMLFormElement"  // Direct DOM reference to the HTML form
}
```

You can use this event to adjust the content of the form, such as serializing
rich elements into hidden form elements, prior to the save taking place.

Invoking this function is equivalent to a call to [[omphalos.event.on()]], and
thus returns a function you can use to cancel the event listener registration
as needed.
