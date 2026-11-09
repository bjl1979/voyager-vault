/* Voyager Vault – bridge to the Android app (Capacitor).
 * In a normal browser every call here is a harmless no-op, so the same code runs as the website. */
(function () {
  'use strict';
  const cap = window.Capacitor;
  const isApp = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plug = name => (isApp && cap.Plugins && cap.Plugins[name]) || null;
  const V = () => plug('VaultNative');

  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function stageFile(file) {
    const v = V();
    const { id } = await v.fileBegin();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const CH = 768 * 1024;
    for (let i = 0; i < bytes.length; i += CH) await v.fileAppend({ id, data: b64(bytes.subarray(i, i + CH)) });
    return id;
  }

  const Native = {
    isApp,
    quiet() { try { return localStorage.getItem('vv-quiet') !== 'off'; } catch { return true; } },
    setQuiet(on) { try { localStorage.setItem('vv-quiet', on ? 'on' : 'off'); } catch {} },

    /** Hand every future alarm of one trip to Android (replaces that trip's previous alarms). */
    async syncTrip(trip) {
      const v = V(); if (!v || !trip) return;
      const alarms = Reminders.tripAlarms(trip, Date.now(), { quiet: this.quiet() });
      try {
        await v.setTripAlarms({ tripId: trip.id, trip: trip.destination || 'Trip', flag: flag(trip.country), start: trip.start || '', alarms });
      } catch (e) { console.warn('alarm sync failed', e); }
    },
    async clearTrip(tripId) { const v = V(); if (v) try { await v.clearTrip({ tripId }); } catch {} },
    async syncAll() { if (!V()) return; for (const t of await DB.allTrips()) await this.syncTrip(t); },

    /** Tasks ticked off from an alarm / notification while the app was closed. */
    async pullDone() {
      const v = V(); if (!v) return 0;
      let items = [];
      try { items = (await v.takeDoneQueue()).items || []; } catch { return 0; }
      let n = 0;
      for (const it of items) {
        const t = await DB.getTrip(it.tripId); if (!t) continue;
        const x = (t.todos || []).find(y => y.id === it.todoId);
        if (x && !x.done) { x.done = true; x.doneAt = it.at || Date.now(); await DB.saveTrip(t); n++; }
      }
      return n;
    },
    async launchTrip() { const v = V(); if (!v) return null; try { return (await v.takeLaunchTrip()).tripId || null; } catch { return null; } },

    async status() { const v = V(); if (!v) return null; try { return await v.getStatus(); } catch { return null; } },
    async openSetting(kind) { const v = V(); if (v) try { return await v.openSetting({ kind }); } catch {} },
    async testAlarm(priority, seconds) { const v = V(); if (v) await v.testAlarm({ priority, seconds }); },
    async keepAwake(on) { const v = V(); if (!v) return false; try { await v.keepAwake({ on }); return true; } catch { return false; } },

    /** Save a file with Android's "Save to…" picker (Downloads, Drive, …). */
    async saveFile(file) {
      const id = await stageFile(file);
      const r = await V().fileSave({ id, name: file.name, mime: file.type || 'application/octet-stream' });
      return !!(r && r.saved);
    },
    /** Open Android's share sheet (WhatsApp, Gmail, Drive, Quick Share…). */
    async shareFile(file, title) {
      const id = await stageFile(file);
      await V().fileShare({ id, name: file.name, mime: file.type || 'application/octet-stream', title: title || file.name });
      return true;
    },

    /** Android back button → close the open panel / go back, otherwise send the app to the background. */
    initBackButton(handler) {
      const A = plug('App'); if (!A) return;
      A.addListener('backButton', () => { if (!handler()) A.minimizeApp(); });
    },
    onResume(fn) { const A = plug('App'); if (A) A.addListener('resume', fn); },
    onChanged(fn) { const v = V(); if (v) v.addListener('changed', fn); },
  };
  window.Native = Native;
})();
