package com.bjl1979.voyagervault;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Keeps exactly one system alarm set: the earliest upcoming reminder. */
final class AlarmScheduler {
    private static final int REQ_FIRE = 4100, REQ_SHOW = 4101;

    private AlarmScheduler() {}

    static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        return am != null && am.canScheduleExactAlarms();
    }

    static void scheduleNext(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent fire = PendingIntent.getBroadcast(c, REQ_FIRE,
                new Intent(c, AlarmReceiver.class).setAction(AlarmReceiver.ACTION_FIRE),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(fire);

        Object[] next = AlarmStore.next(c, System.currentTimeMillis());
        if (next == null) return;
        long at = (Long) next[0];
        boolean urgent = "urgent".equals(next[1]);

        try {
            if (canExact(c) && urgent) {
                // Alarm-clock alarms are never delayed by Doze or battery saving.
                PendingIntent show = PendingIntent.getActivity(c, REQ_SHOW,
                        new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), fire);
            } else if (canExact(c)) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
        }
    }
}
