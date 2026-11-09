package com.bjl1979.voyagervault;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

import java.util.List;

/** Fires due reminders, and handles Done / Snooze / reboot. */
public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_FIRE = "com.bjl1979.voyagervault.FIRE";
    static final String ACTION_DONE = "com.bjl1979.voyagervault.DONE";
    static final String ACTION_SNOOZE = "com.bjl1979.voyagervault.SNOOZE";
    static final String CH_URGENT = "vv_urgent_v1", CH_NORMAL = "vv_normal_v1";
    static final int RED = 0xFFD62839;

    @Override
    public void onReceive(Context c, Intent in) {
        String action = in.getAction() == null ? "" : in.getAction();
        switch (action) {
            case ACTION_DONE:
                AlarmStore.markDone(c, in.getStringExtra("tripId"), in.getStringExtra("todoId"));
                cancel(c, in.getStringExtra("tripId"), in.getStringExtra("todoId"));
                VaultNativePlugin.notifyChanged();
                break;
            case ACTION_SNOOZE:
                AlarmStore.snooze(c, in.getStringExtra("tripId"), in.getStringExtra("todoId"),
                        in.getStringExtra("title"), in.getStringExtra("priority"));
                cancel(c, in.getStringExtra("tripId"), in.getStringExtra("todoId"));
                break;
            case ACTION_FIRE:
                List<JSONObject> due = AlarmStore.takeDue(c, System.currentTimeMillis());
                for (JSONObject d : due) show(c, d);
                break;
            default: // BOOT_COMPLETED, MY_PACKAGE_REPLACED, TIME_SET, TIMEZONE_CHANGED
                break;
        }
        AlarmScheduler.scheduleNext(c);
    }

    static int notifId(String tripId, String todoId) { return (tripId + "/" + todoId).hashCode(); }

    static void cancel(Context c, String tripId, String todoId) {
        NotificationManagerCompat.from(c).cancel(notifId(tripId, todoId));
    }

    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel u = new NotificationChannel(CH_URGENT, "Urgent to-do alarms", NotificationManager.IMPORTANCE_HIGH);
        u.setDescription("Full-screen red alarms for urgent tasks, every 6 hours until done");
        Uri alarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarm == null) alarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        u.setSound(alarm, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        u.enableVibration(true);
        u.setVibrationPattern(new long[]{0, 600, 300, 600, 300, 900});
        u.enableLights(true);
        u.setLightColor(Color.RED);
        u.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(u);

        NotificationChannel n = new NotificationChannel(CH_NORMAL, "To-do reminders", NotificationManager.IMPORTANCE_HIGH);
        n.setDescription("Reminders for normal tasks at the time you set");
        n.enableVibration(true);
        n.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(n);
    }

    static PendingIntent action(Context c, String act, JSONObject d, int code) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(act)
                .putExtra("tripId", d.optString("tripId")).putExtra("todoId", d.optString("todoId"))
                .putExtra("title", d.optString("title")).putExtra("priority", d.optString("priority"));
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent openTrip(Context c, String tripId, int code) {
        Intent i = new Intent(c, MainActivity.class).putExtra(MainActivity.EXTRA_TRIP, tripId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static Intent alarmScreen(Context c, JSONObject d) {
        return new Intent(c, UrgentAlarmActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("data", d.toString());
    }

    static void show(Context c, JSONObject d) {
        ensureChannels(c);
        boolean urgent = "urgent".equals(d.optString("priority"));
        String tripId = d.optString("tripId"), todoId = d.optString("todoId");
        int id = notifId(tripId, todoId);
        String trip = (d.optString("flag") + " " + d.optString("trip")).trim();
        String when = UrgentAlarmActivity.tripCountdown(d.optString("start"));

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, urgent ? CH_URGENT : CH_NORMAL)
                .setSmallIcon(R.drawable.ic_stat_plane)
                .setContentIntent(openTrip(c, tripId, id))
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .addAction(0, urgent ? "✓ DONE" : "MARK DONE", action(c, ACTION_DONE, d, id + 1));

        if (urgent) {
            PendingIntent full = PendingIntent.getActivity(c, id + 3, alarmScreen(c, d),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.setContentTitle("🔴 URGENT · " + d.optString("title"))
                    .setContentText(trip + (when.isEmpty() ? "" : " · " + when) + " · repeats every 6 h until done")
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setColor(RED).setColorized(true)
                    .setFullScreenIntent(full, true)
                    .addAction(0, "REMIND IN 6 H", action(c, ACTION_SNOOZE, d, id + 2));
        } else {
            b.setContentTitle(d.optString("title"))
                    .setContentText(trip + " · Normal reminder")
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setColor(0xFF1E6FD9)
                    .addAction(0, "OPEN", openTrip(c, tripId, id + 4));
        }
        try { NotificationManagerCompat.from(c).notify(id, b.build()); } catch (SecurityException ignored) {}

        // With "show over other apps" allowed, the red screen opens even while the phone is in use.
        if (urgent && Build.VERSION.SDK_INT >= 23 && Settings.canDrawOverlays(c)) {
            try { c.startActivity(alarmScreen(c, d)); } catch (Exception ignored) {}
        }
    }
}
