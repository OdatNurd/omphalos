---
title: Panels
sidebar:
  order: 5
---

This page would discuss panels, which are simple `html` pages that you write
that Omphalos will serve as a part of it's internal control panel.

Panels allow you to send messages to overlays or extensions, allowing you full
control to get status information or take actions throughout your stream
layout.

When the HTML for panels loads, it has default CSS rules applied for simple
consistency; you are of course free to override any and all style rules as you
see fit; the defaults are just to give a base to work from.

When panels load, [[omphalos.config]] is set to the configuration under which
Omphalos is currently running. This is the same configuration as is loaded from
the configuration files.

In addition, a global variables named [[omphalos]] is set up to provide
an API to the panel that allows it to interface with the system.
