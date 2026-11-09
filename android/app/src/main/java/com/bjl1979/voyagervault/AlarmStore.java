package com.bjl1979.voyagervault;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Keeps every future alarm on the phone (SharedPreferences), so alarms can ring
 * with the app closed, the phone locked and no internet.
 *
 * trip:<id>  → {"trip":"Singapore","flag":"🇸🇬","start":"2026-12-14",
 *               "alarms":[{"todoId":"…","title":"…","priority":"urgent","times":[ms,…]}]}
 * done       → [{"tripId":"…","todoId":"…","at":ms}]  (ticked off from an alarm, picked up by the app)
 */
final class AlarmStore {
    static final long SNOOZE_MS = 6L * 3600_000L;
    private static final String PREFS = "vv_alarms";
    private static final String TRIP = "trip:";

    private AlarmStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void putTrip(Context c, String tripId, JSONObject data) {
        prefs(c).edit().putString(TRIP + tripId, data.toString()).apply();
    }

    static synchronized void removeTrip(Context c, String tripId) {
        prefs(c).edit().remove(TRIP + tripId).apply();
    }

    /** All stored trips as (tripId, data) pairs. */
    static synchronized List<Object[]> trips(Context c) {
        List<Object[]> out = new ArrayList<>();
        for (Map.Entry<String, ?> e : prefs(c).getAll().entrySet()) {
            if (!e.getKey().startsWith(TRIP)) continue;
            try {
                out.add(new Object[]{e.getKey().substring(TRIP.length()), new JSONObject(String.valueOf(e.getValue()))});
            } catch (JSONException ignored) {}
        }
        return out;
    }

    /** Earliest alarm time after `now`, with its priority; null when nothing is scheduled. */
    static synchronized Object[] next(Context c, long now) {
        long best = Long.MAX_VALUE;
        String prio = "normal";
        for (Object[] t : trips(c)) {
            JSONArray alarms = ((JSONObject) t[1]).optJSONArray("alarms");
            if (alarms == null) continue;
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject a = alarms.optJSONObject(i);
                JSONArray times = a.optJSONArray("times");
                if (times == null) continue;
                for (int k = 0; k < times.length(); k++) {
                    long at = times.optLong(k);
                    if (at > now && at < best) { best = at; prio = a.optString("priority", "normal"); }
                }
            }
        }
        return best == Long.MAX_VALUE ? null : new Object[]{best, prio};
    }

    /**
     * Removes every time that is due (≤ now + slack) and returns the alarms to show now:
     * {tripId, tripName, flag, start, todoId, title, priority, remainingTimes}
     */
    static synchronized List<JSONObject> takeDue(Context c, long now) {
        List<JSONObject> due = new ArrayList<>();
        long cutoff = now + 30_000L;
        for (Object[] t : trips(c)) {
            String tripId = (String) t[0];
            JSONObject data = (JSONObject) t[1];
            JSONArray alarms = data.optJSONArray("alarms");
            if (alarms == null) continue;
            boolean changed = false;
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject a = alarms.optJSONObject(i);
                JSONArray times = a.optJSONArray("times");
                if (times == null) continue;
                JSONArray keep = new JSONArray();
                boolean fire = false;
                for (int k = 0; k < times.length(); k++) {
                    long at = times.optLong(k);
                    if (at <= cutoff) fire = true; else keep.put(at);
                }
                if (fire) {
                    changed = true;
                    try {
                        a.put("times", keep);
                        JSONObject d = new JSONObject();
                        d.put("tripId", tripId);
                        d.put("trip", data.optString("trip", "Trip"));
                        d.put("flag", data.optString("flag", ""));
                        d.put("start", data.optString("start", ""));
                        d.put("todoId", a.optString("todoId"));
                        d.put("title", a.optString("title"));
                        d.put("priority", a.optString("priority", "normal"));
                        d.put("remaining", keep.length());
                        d.put("nextAt", keep.length() > 0 ? keep.optLong(0) : 0);
                        due.add(d);
                    } catch (JSONException ignored) {}
                }
            }
            if (changed) putTrip(c, tripId, data);
        }
        return due;
    }

    /** Ticked off from the alarm screen or notification: stop its alarms and tell the app. */
    static synchronized void markDone(Context c, String tripId, String todoId) {
        dropTodo(c, tripId, todoId);
        if ("__test__".equals(tripId)) return;
        try {
            JSONArray q = new JSONArray(prefs(c).getString("done", "[]"));
            JSONObject o = new JSONObject();
            o.put("tripId", tripId);
            o.put("todoId", todoId);
            o.put("at", System.currentTimeMillis());
            q.put(o);
            prefs(c).edit().putString("done", q.toString()).apply();
        } catch (JSONException ignored) {}
    }

    /** "Remind me in 6 h": the next alarm for this task is exactly 6 hours from now. */
    static synchronized void snooze(Context c, String tripId, String todoId, String title, String priority) {
        long now = System.currentTimeMillis(), at = now + SNOOZE_MS;
        String raw = prefs(c).getString(TRIP + tripId, null);
        try {
            JSONObject data = raw != null ? new JSONObject(raw) : new JSONObject().put("trip", "Trip");
            JSONArray alarms = data.optJSONArray("alarms");
            if (alarms == null) { alarms = new JSONArray(); data.put("alarms", alarms); }
            JSONObject target = null;
            for (int i = 0; i < alarms.length(); i++)
                if (todoId.equals(alarms.optJSONObject(i).optString("todoId"))) target = alarms.optJSONObject(i);
            if (target == null) {
                target = new JSONObject().put("todoId", todoId).put("title", title).put("priority", priority);
                alarms.put(target);
            }
            JSONArray old = target.optJSONArray("times"), keep = new JSONArray().put(at);
            if (old != null) for (int k = 0; k < old.length(); k++) if (old.optLong(k) > at) keep.put(old.optLong(k));
            target.put("times", keep);
            putTrip(c, tripId, data);
        } catch (JSONException ignored) {}
    }

    private static void dropTodo(Context c, String tripId, String todoId) {
        String raw = prefs(c).getString(TRIP + tripId, null);
        if (raw == null) return;
        try {
            JSONObject data = new JSONObject(raw);
            JSONArray alarms = data.optJSONArray("alarms"), keep = new JSONArray();
            if (alarms != null) for (int i = 0; i < alarms.length(); i++)
                if (!todoId.equals(alarms.optJSONObject(i).optString("todoId"))) keep.put(alarms.optJSONObject(i));
            data.put("alarms", keep);
            putTrip(c, tripId, data);
        } catch (JSONException ignored) {}
    }

    static synchronized JSONArray takeDoneQueue(Context c) {
        JSONArray q;
        try { q = new JSONArray(prefs(c).getString("done", "[]")); } catch (JSONException e) { q = new JSONArray(); }
        prefs(c).edit().remove("done").apply();
        return q;
    }
}
