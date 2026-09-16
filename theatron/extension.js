/******************************************************************************/


export const symbols = {
};


/******************************************************************************/


/* Set up the global branding theme for Theatron.
 *
 * This ensures that the branding form always has a complete set of default
 * values, even on first load or if we add new branding fields in a future
 update. */
function setupTheme(omphalos) {
  const themeState = omphalos.Skepsis('form:branding:branding', {});
  const currentTheme = themeState.value;
  let needsUpdate = false;

  const defaults = {
    colorPrimaryBg: '#3B82F6',
    colorPrimaryText: '#FFFFFF',
    colorSecondaryBg: '#1E293B',
    colorSecondaryText: '#C8D2E0',
    colorAccent: '#F59E0B',
    fontPrimary: 'Montserrat',
    fontSecondary: 'Open Sans'
  };

  // Loop through our defaults and inject any that are missing.
  for (const key of Object.keys(defaults)) {
    if (currentTheme[key] === undefined) {
      currentTheme[key] = defaults[key];
      needsUpdate = true;
    }
  }

  // If we seeded a brand new object or added missing keys, push the update so
  // the rest of the system (and storage) knows about it.
  if (needsUpdate === true) {
    themeState.update();
    omphalos.log.info('initialized default theatron branding');
  }
}


/******************************************************************************/


/* Set up the timer functionality in Theatron.
 *
 * This provides a timer that can count up or down, and has configurable
 * display properties (although those are not referenced here).
 *
 * The extension acts as the Single Source of Truth on what time the timer is
 * trying to target and whether or not it is running. */
function setupTimer(omphalos) {
  // The current state of the timer. This indicates if the timer is actively
  // running or not, how long is left, and what time we are targetting when we
  // are running.
  const timerState = omphalos.Skepsis('timerState', {
    running: false,
    remainingMs: 300000,
    targetEpoch: 0
  });

  // The intended duration of the timer, when we are running in the mode where
  // we are counting down.
  //
  // When the duration changes, we update the timer state.
  const timerDuration = omphalos.Skepsis('timerDuration', 300);
  timerDuration.on(newState => {
    const current = timerState.value;

    // If the timer is not currently running and we are counting down, then
    // update how much time is remaining.
    if (current.running === false && current.targetEpoch === 0 && timerMode.value === 'countdown') {
      current.remainingMs = newState * 1000;
      timerState.update();
    }
  });

  // The mode of the timer; whether we are counting up or counting down.
  //
  // When the timer mode changes, we reset the timer.
  const timerMode = omphalos.Skepsis('timerMode', 'countdown');
  timerMode.on(() => {
    omphalos.event.raise('timer.reset');
  });

  //----------------------------------------------------------------------------
  // TIMER START
  //----------------------------------------------------------------------------
  omphalos.event.on('timer.start', () => {
    // Nothing to do if we are already running.
    const state = timerState.value;
    if (state.running === true) {
      return;
    }

    // We're running now.
    state.running = true;

    // If we're counting down, then the target we are counting towards is a date
    // in the future; otherwise it's a date in the past.
    if (timerMode.value === 'countdown') {
      state.targetEpoch = Date.now() + state.remainingMs;
    } else {
      state.targetEpoch = Date.now() - state.remainingMs;
    }

    // Update the state
    timerState.update();
    omphalos.log.info('timer started');
  });

  //----------------------------------------------------------------------------
  // TIMER PAUSE
  //----------------------------------------------------------------------------
  omphalos.event.on('timer.pause', () => {
    // If we're already stopped, nothing to do.
    const state = timerState.value;
    if (state.running === false) {
      return;
    }

    // We are now stopped.
    state.running = false;

    // While we are stopped, we need to track how much time is left on the timer
    // so that we can reset when we start again.
    if (timerMode.value === 'countdown') {
      state.remainingMs = Math.max(0, state.targetEpoch - Date.now());
    } else {
      state.remainingMs = Math.max(0, Date.now() - state.targetEpoch);
    }

    // Update the state
    timerState.update();
    omphalos.log.info('timer paused');
  });

  //----------------------------------------------------------------------------
  // TIMER RESET
  //----------------------------------------------------------------------------
  omphalos.event.on('timer.reset', () => {
    const state = timerState.value;

    // We are no longer running
    state.running = false;

    // Set the remaining time for the timer to the appropriate value; the
    // duration if we're counting down, or 0 otherwise.
    if (timerMode.value === 'countdown') {
      state.remainingMs = timerDuration.value * 1000;
    } else {
      state.remainingMs = 0;
    }

    // Indicate that we're not targetting a specific time; this will need to be
    // set when we restart the timer (this is how we distinguish a restart after
    // a pause from a restart after a reset).
    state.targetEpoch = 0;

    // Update the state
    timerState.update();
    omphalos.log.info('timer reset');
  });

  //----------------------------------------------------------------------------
  // TIMER ADD/REMOVE TIME
  //----------------------------------------------------------------------------
  omphalos.event.on('timer.add', data => {
    const state = timerState.value;

    // Determine how much time we want to add based on the incoming value, which
    // can be positive or negative.
    const msToAdd = (data.seconds ?? 0) * 1000;

    // Adjust the time remaining for the timer. How this works depends on
    // whether or not the timer is actually running.
    if (state.running === true) {
      if (timerMode.value === 'countdown') {
        // If the timer has expired, use the current date and go from there.
        // Otherwise, we can just add the time.
        if (Date.now() > state.targetEpoch) {
          state.targetEpoch = Date.now() + msToAdd;
        } else {
          state.targetEpoch += msToAdd;
        }
      } else {
        // This is a count up timer; remove some time.
        state.targetEpoch -= msToAdd;
      }
    } else {
      // We're not running, so we can just adjust the remaining time for later,
      // making sure we don't go negative.
      state.remainingMs += msToAdd;
      if (state.remainingMs < 0) {
        state.remainingMs = 0;
      }
    }

    // Update the state
    timerState.update();
  });
}


/******************************************************************************/


/* The main entry point for the extension. This gets the omphalos API object as
 * an argument.
 *
 * Kick off all of our subsystem setups as needed. */
export function main(omphalos) {
  omphalos.log.info('initializing Theatron');

  setupTheme(omphalos);
  setupTimer(omphalos);
}


/******************************************************************************/
