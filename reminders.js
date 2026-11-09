/* Voyager Vault – to-do reminder rules (pure functions, no storage, no UI)
 *
 *  Normal  : one reminder at the time you set.
 *  Urgent  : red full-screen alarm at the time you set AND from 2 days before
 *            the trip starts (09:00), repeating every 6 hours until done.
 *            Repeats stop once the trip has ended.
 *  Delayed : not important right now, so no reminders.
 *  Quiet hours (23:00–06:00, optional): a repeat landing in the night waits until 06:00.
 */
(function (root) {
  'use strict';
  const HOUR = 3600e3, DAY = 24 * HOUR;
  const R = {
    EVERY_H: 6, LEAD_DAYS: 2, START_HOUR: 9, QUIET_FROM: 23, QUIET_TO: 6, MAX: 200, NO_DATES_DAYS: 14,

    /** 'YYYY-MM-DDTHH:MM' (local) → epoch ms */
    parseLocal(s) {
      if (!s) return null;
      const [d, t = '09:00'] = String(s).split('T');
      const [y, m, dd] = d.split('-').map(Number);
      const [h, mi] = t.split(':').map(Number);
      if (!y || !m || !dd) return null;
      return new Date(y, m - 1, dd, h || 0, mi || 0, 0, 0).getTime();
    },
    /** local date 'YYYY-MM-DD' shifted by `addDays`, at hour:minute */
    dayAt(dateStr, hour, minute = 0, addDays = 0) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d + addDays, hour, minute, 0, 0).getTime();
    },
    inQuiet(ms) { const h = new Date(ms).getHours(); return h >= this.QUIET_FROM || h < this.QUIET_TO; },
    quietShift(ms) {
      const d = new Date(ms), h = d.getHours();
      if (h >= this.QUIET_FROM) { d.setDate(d.getDate() + 1); d.setHours(this.QUIET_TO, 0, 0, 0); }
      else if (h < this.QUIET_TO) d.setHours(this.QUIET_TO, 0, 0, 0);
      return d.getTime();
    },
    /** When the 2-days-before alarm series starts (or null if the trip has no start date) */
    leadStart(trip) {
      return trip && trip.start ? this.dayAt(trip.start, this.START_HOUR, 0, -this.LEAD_DAYS) : null;
    },
    tripEnd(trip) {
      const e = trip && (trip.end || trip.start);
      return e ? this.dayAt(e, 23, 59) : null;
    },

    /** All future fire times (epoch ms, ascending) for one to-do. */
    times(trip, todo, now = Date.now(), opts = {}) {
      const quiet = opts.quiet !== false;
      if (!todo || todo.done || todo.priority === 'delayed') return [];
      const at = this.parseLocal(todo.remindAt);
      if (todo.priority !== 'urgent') return at && at > now ? [at] : [];

      const anchors = [at, this.leadStart(trip)].filter(x => x != null);
      if (!anchors.length) return [];
      const anchor = Math.min(...anchors);
      const end = this.tripEnd(trip) ?? anchor + this.NO_DATES_DAYS * DAY;
      const step = this.EVERY_H * HOUR;
      const out = [];
      let k = anchor > now ? 0 : Math.ceil((now + 1000 - anchor) / step);
      for (; out.length < this.MAX; k++) {
        const t = anchor + k * step;
        if (t > end) break;
        const s = quiet ? this.quietShift(t) : t;
        if (s > end || s <= now) continue;
        if (out[out.length - 1] !== s) out.push(s);
      }
      // the exact time you chose always rings, even if it falls in quiet hours
      if (at && at > now && at <= end && !out.includes(at)) { out.push(at); out.sort((a, b) => a - b); }
      return out;
    },

    /** Everything the phone needs to ring the alarms for one trip. */
    tripAlarms(trip, now = Date.now(), opts = {}) {
      return (trip.todos || []).map(t => ({
        todoId: t.id, title: t.title, priority: t.priority,
        times: this.times(trip, t, now, opts),
      })).filter(a => a.times.length);
    },

    fmt(ms) {
      const d = new Date(ms), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getDate()} ${M[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    /** One-line description under a task, e.g. "⏰ 12 Dec 09:00 · every 6 h" */
    describe(trip, todo, now = Date.now(), opts = {}) {
      if (todo.done) return todo.doneAt ? `✓ Done ${this.fmt(todo.doneAt)}` : '✓ Done';
      if (todo.priority === 'delayed') return 'No reminders';
      const next = this.times(trip, todo, now, opts)[0];
      const at = this.parseLocal(todo.remindAt);
      if (todo.priority === 'urgent') {
        if (next) return `⏰ ${this.fmt(next)} · every ${this.EVERY_H} h until done`;
        const end = this.tripEnd(trip);
        if (end && end < now) return 'Trip ended · reminders stopped';
        return 'Set a time or trip dates to get alarms';
      }
      if (next) return `⏰ ${this.fmt(next)}`;
      if (at) return `⏰ ${this.fmt(at)} · overdue`;
      return 'No reminder set';
    },
  };
  root.Reminders = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
