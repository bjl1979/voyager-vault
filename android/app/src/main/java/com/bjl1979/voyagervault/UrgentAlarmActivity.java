package com.bjl1979.voyagervault;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Full-screen red alarm for urgent to-dos. Shows over the lock screen. */
public class UrgentAlarmActivity extends Activity {
    private JSONObject d;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFFB01E2E);
        getWindow().setNavigationBarColor(0xFF8F0F1C);
        render(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        render(intent);
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    static String tripCountdown(String start) {
        if (start == null || start.length() < 10) return "";
        try {
            Calendar s = Calendar.getInstance();
            s.setTime(new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(start));
            Calendar now = Calendar.getInstance();
            now.set(Calendar.HOUR_OF_DAY, 0); now.set(Calendar.MINUTE, 0); now.set(Calendar.SECOND, 0); now.set(Calendar.MILLISECOND, 0);
            long days = Math.round((s.getTimeInMillis() - now.getTimeInMillis()) / 86_400_000.0);
            if (days > 1) return "trip in " + days + " days";
            if (days == 1) return "trip tomorrow";
            if (days == 0) return "trip starts today";
            return "trip in progress";
        } catch (Exception e) { return ""; }
    }

    private void render(Intent in) {
        try { d = new JSONObject(in.getStringExtra("data")); } catch (JSONException | NullPointerException e) { d = new JSONObject(); }
        final String tripId = d.optString("tripId"), todoId = d.optString("todoId");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(48), dp(24), dp(36));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xFFFF4A5C, 0xFFD62839, 0xFF8F0F1C});
        root.setBackground(bg);

        Date now = new Date();
        root.addView(text(new SimpleDateFormat("HH:mm", Locale.getDefault()).format(now), 64, Color.WHITE, false));
        root.addView(text(new SimpleDateFormat("EEE, d MMMM", Locale.getDefault()).format(now), 15, 0xE6FFFFFF, false));

        TextView ring = text("⚠️", 52, Color.WHITE, false);
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(0x33FFFFFF);
        circle.setStroke(dp(10), 0x14FFFFFF);
        ring.setBackground(circle);
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(dp(128), dp(128));
        rp.topMargin = dp(36); rp.bottomMargin = dp(18);
        root.addView(ring, rp);

        TextView label = text("URGENT TO-DO", 14, Color.WHITE, true);
        label.setLetterSpacing(0.25f);
        root.addView(label);
        TextView title = text(d.optString("title", "Urgent task"), 27, Color.WHITE, true);
        title.setPadding(0, dp(12), 0, dp(8));
        root.addView(title);
        String cd = tripCountdown(d.optString("start"));
        root.addView(text((d.optString("flag") + " " + d.optString("trip", "")).trim() + (cd.isEmpty() ? "" : " · " + cd), 17, 0xF2FFFFFF, false));
        long nextAt = d.optLong("nextAt", 0);
        String rep = "Repeats every 6 h until you tap DONE";
        if (nextAt > 0) rep += " · next " + new SimpleDateFormat("d MMM HH:mm", Locale.getDefault()).format(new Date(nextAt));
        TextView r = text(rep, 13, 0xC8FFFFFF, false);
        r.setPadding(0, dp(10), 0, 0);
        root.addView(r);

        View spacer = new View(this);
        root.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1f));

        TextView done = text("✓  DONE", 20, 0xFFB01E2E, true);
        GradientDrawable dbg = new GradientDrawable();
        dbg.setColor(Color.WHITE); dbg.setCornerRadius(dp(40));
        done.setBackground(dbg);
        done.setPadding(0, dp(18), 0, dp(18));
        done.setOnClickListener(v -> {
            AlarmStore.markDone(this, tripId, todoId);
            AlarmReceiver.cancel(this, tripId, todoId);
            AlarmScheduler.scheduleNext(this);
            VaultNativePlugin.notifyChanged();
            finish();
        });
        root.addView(done, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView snooze = text("Remind me in 6 h", 16, Color.WHITE, true);
        GradientDrawable sbg = new GradientDrawable();
        sbg.setColor(Color.TRANSPARENT); sbg.setCornerRadius(dp(40)); sbg.setStroke(dp(2), 0x99FFFFFF);
        snooze.setBackground(sbg);
        snooze.setPadding(0, dp(15), 0, dp(15));
        snooze.setOnClickListener(v -> {
            if (!"__test__".equals(tripId)) AlarmStore.snooze(this, tripId, todoId, d.optString("title"), "urgent");
            AlarmReceiver.cancel(this, tripId, todoId);
            AlarmScheduler.scheduleNext(this);
            finish();
        });
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sp.topMargin = dp(12);
        root.addView(snooze, sp);

        if (!"__test__".equals(tripId)) {
            TextView open = text("Open trip in Voyager Vault", 14, 0xCCFFFFFF, false);
            open.setPadding(0, dp(16), 0, 0);
            open.setOnClickListener(v -> {
                AlarmReceiver.cancel(this, tripId, todoId);
                startActivity(new Intent(this, MainActivity.class).putExtra(MainActivity.EXTRA_TRIP, tripId)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
                finish();
            });
            root.addView(open);
        }
        setContentView(root);
    }
}
