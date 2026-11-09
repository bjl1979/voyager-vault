package com.bjl1979.voyagervault;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    static final String EXTRA_TRIP = "vv_trip";
    private static String pendingTrip;

    static synchronized String takePendingTrip() {
        String t = pendingTrip;
        pendingTrip = null;
        return t;
    }

    private static synchronized void remember(Intent i) {
        if (i != null && i.getStringExtra(EXTRA_TRIP) != null) pendingTrip = i.getStringExtra(EXTRA_TRIP);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VaultNativePlugin.class);
        remember(getIntent());
        super.onCreate(savedInstanceState);
        fitAroundBarsAndKeyboard();
        AlarmScheduler.scheduleNext(this);
    }

    /**
     * Android 15 draws apps edge to edge. Keep the app below the status bar, above the navigation bar,
     * and – when typing – above the keyboard, so the text box you type in is never hidden.
     */
    private void fitAroundBarsAndKeyboard() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        View web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, wi) -> {
            Insets bars = wi.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = wi.getInsets(WindowInsetsCompat.Type.ime());
            ViewGroup.MarginLayoutParams mlp = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
            mlp.leftMargin = bars.left;
            mlp.rightMargin = bars.right;
            mlp.topMargin = bars.top;
            mlp.bottomMargin = Math.max(bars.bottom, ime.bottom);
            v.setLayoutParams(mlp);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(web);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        remember(intent);
    }
}
