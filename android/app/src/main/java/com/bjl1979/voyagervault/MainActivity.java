package com.bjl1979.voyagervault;

import android.content.Intent;
import android.os.Bundle;

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
        AlarmScheduler.scheduleNext(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        remember(intent);
    }
}
