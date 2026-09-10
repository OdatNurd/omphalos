```javascript {{extra}}
// Listen for an event in the current bundle
const unlisten = omphalos.event.on('my-event', (payload) => {
  omphalos.log.info(`Got event with data: ${payload.some}`);
});

// Listen for an event from a specific external bundle
const unlistenExt = omphalos.event.on('their-event', 'other-bundle', (payload) => {
  omphalos.log.info(`Got external event with data: ${payload.some}`);
});

// Raise an event to peers in the current bundle
omphalos.event.raise('my-event', { some: 'data' });

// Raise an event to peers in a specific external bundle
omphalos.event.raiseToBundle('their-event', 'other-bundle', { some: 'data' });
