:::caution[server side use]
Be careful of invoking this from server side code immediately at startup;
messages can only be sent to connected assets, and at the time the bundles load
the front end has not initialized yet.

For assets in your own bundle, you can use [[omphalos.event.peerConnected()]]
to know when peers have connected, so that you know it is safe to raise events
they may want to handle.
:::