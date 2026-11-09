package com.bjl1979.voyagervault;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import android.view.WindowManager;

import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

@CapacitorPlugin(
        name = "VaultNative",
        permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class VaultNativePlugin extends Plugin {
    private static VaultNativePlugin instance;

    @Override
    public void load() {
        instance = this;
        AlarmReceiver.ensureChannels(getContext());
    }

    /** Something changed outside the app (task ticked off from an alarm) – let the app refresh. */
    static void notifyChanged() {
        VaultNativePlugin p = instance;
        if (p != null) p.notifyListeners("changed", new JSObject());
    }

    // ---------------- alarms ----------------

    @PluginMethod
    public void setTripAlarms(PluginCall call) {
        String tripId = call.getString("tripId");
        if (tripId == null) { call.reject("tripId missing"); return; }
        try {
            JSONObject data = new JSONObject();
            data.put("trip", call.getString("trip", "Trip"));
            data.put("flag", call.getString("flag", ""));
            data.put("start", call.getString("start", ""));
            JSArray alarms = call.getArray("alarms", new JSArray());
            data.put("alarms", new JSONArray(alarms.toString()));
            if (alarms.length() == 0) AlarmStore.removeTrip(getContext(), tripId);
            else AlarmStore.putTrip(getContext(), tripId, data);
            AlarmScheduler.scheduleNext(getContext());
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void clearTrip(PluginCall call) {
        AlarmStore.removeTrip(getContext(), call.getString("tripId", ""));
        AlarmScheduler.scheduleNext(getContext());
        call.resolve();
    }

    @PluginMethod
    public void takeDoneQueue(PluginCall call) {
        JSObject r = new JSObject();
        try { r.put("items", new JSArray(AlarmStore.takeDoneQueue(getContext()).toString())); }
        catch (Exception e) { r.put("items", new JSArray()); }
        call.resolve(r);
    }

    @PluginMethod
    public void takeLaunchTrip(PluginCall call) {
        JSObject r = new JSObject();
        r.put("tripId", MainActivity.takePendingTrip());
        call.resolve(r);
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        int secs = call.getInt("seconds", 10);
        try {
            JSONObject a = new JSONObject().put("todoId", "test").put("title", "Test urgent alarm")
                    .put("priority", call.getString("priority", "urgent"))
                    .put("times", new JSONArray().put(System.currentTimeMillis() + secs * 1000L));
            JSONObject data = new JSONObject().put("trip", "Voyager Vault").put("flag", "✈").put("start", "")
                    .put("alarms", new JSONArray().put(a));
            AlarmStore.putTrip(getContext(), "__test__", data);
            AlarmScheduler.scheduleNext(getContext());
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // ---------------- permissions ----------------

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("notifications", NotificationManagerCompat.from(c).areNotificationsEnabled());
        r.put("exact", AlarmScheduler.canExact(c));
        boolean fs = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            fs = nm != null && nm.canUseFullScreenIntent();
        }
        r.put("fullScreen", fs);
        PowerManager pm = c.getSystemService(PowerManager.class);
        r.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        r.put("overlay", Settings.canDrawOverlays(c));
        call.resolve(r);
    }

    @PluginMethod
    public void openSetting(PluginCall call) {
        String kind = call.getString("kind", "");
        Context c = getContext();
        Uri pkg = Uri.parse("package:" + c.getPackageName());
        Intent i;
        switch (kind) {
            case "notifications":
                if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED
                        && getPermissionState("notifications") != PermissionState.DENIED) {
                    requestPermissionForAlias("notifications", call, "notifPermDone");
                    return;
                }
                i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
                break;
            case "exact":
                i = Build.VERSION.SDK_INT >= 31 ? new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg) : appDetails(pkg);
                break;
            case "fullScreen":
                i = Build.VERSION.SDK_INT >= 34 ? new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg) : appDetails(pkg);
                break;
            case "battery":
                i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg);
                break;
            case "overlay":
                i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkg);
                break;
            case "installUpdates":
                i = Build.VERSION.SDK_INT >= 26 ? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, pkg) : appDetails(pkg);
                break;
            default:
                i = appDetails(pkg);
        }
        try { getActivity().startActivity(i); }
        catch (Exception e) { try { getActivity().startActivity(appDetails(pkg)); } catch (Exception ignored) {} }
        call.resolve();
    }

    private Intent appDetails(Uri pkg) { return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg); }

    @PermissionCallback
    private void notifPermDone(PluginCall call) { call.resolve(); }

    // ---------------- screen ----------------

    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            if (on) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve();
    }

    // ---------------- files (backup zip, sharing documents) ----------------

    private File staged(String id) {
        File dir = new File(getContext().getCacheDir(), "staging");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return new File(dir, id.replaceAll("[^a-zA-Z0-9-]", ""));
    }

    @PluginMethod
    public void fileBegin(PluginCall call) {
        File old = new File(getContext().getCacheDir(), "staging");
        File[] files = old.listFiles();
        if (files != null) for (File f : files) if (System.currentTimeMillis() - f.lastModified() > 3600_000L) //noinspection ResultOfMethodCallIgnored
            f.delete();
        String id = UUID.randomUUID().toString();
        try { new FileOutputStream(staged(id)).close(); } catch (Exception e) { call.reject(e.getMessage()); return; }
        JSObject r = new JSObject(); r.put("id", id); call.resolve(r);
    }

    @PluginMethod
    public void fileAppend(PluginCall call) {
        try (FileOutputStream out = new FileOutputStream(staged(call.getString("id", "")), true)) {
            out.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void fileSave(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(call.getString("mime", "application/octet-stream"))
                .putExtra(Intent.EXTRA_TITLE, call.getString("name", "file"));
        startActivityForResult(call, i, "fileSaved");
    }

    @ActivityCallback
    private void fileSaved(PluginCall call, ActivityResult result) {
        JSObject r = new JSObject();
        File src = staged(call.getString("id", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            r.put("saved", false); call.resolve(r); return;
        }
        try (InputStream in = new FileInputStream(src);
             OutputStream out = getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            r.put("saved", true);
            call.resolve(r);
        } catch (Exception e) { call.reject("Could not save: " + e.getMessage()); }
        finally { //noinspection ResultOfMethodCallIgnored
            src.delete(); }
    }

    @PluginMethod
    public void fileShare(PluginCall call) {
        try {
            File src = staged(call.getString("id", ""));
            File dir = new File(getContext().getCacheDir(), "share");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            String name = call.getString("name", "file").replaceAll("[\\\\/:*?\"<>|]", "-");
            File dest = new File(dir, name);
            //noinspection ResultOfMethodCallIgnored
            dest.delete();
            if (!src.renameTo(dest)) { call.reject("Could not prepare the file"); return; }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", dest);
            Intent send = new Intent(Intent.ACTION_SEND).setType(call.getString("mime", "application/octet-stream"))
                    .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(send, call.getString("title", name)));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // ---------------- in-app updates ----------------

    @PluginMethod
    public void appInfo(PluginCall call) {
        JSObject r = new JSObject();
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("versionName", pi.versionName);
            r.put("versionCode", Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode);
        } catch (Exception e) { r.put("versionName", "?"); r.put("versionCode", 0); }
        r.put("canInstall", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(r);
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setInstanceFollowRedirects(true);
        c.setUseCaches(false);
        if (c.getResponseCode() != 200) throw new Exception("Server replied " + c.getResponseCode());
        return c;
    }

    /** Reads a small text file (the version list) from the internet. */
    @PluginMethod
    public void fetchText(PluginCall call) {
        String url = call.getString("url", "");
        new Thread(() -> {
            try {
                HttpURLConnection c = open(url);
                try (InputStream in = c.getInputStream()) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    JSObject r = new JSObject();
                    r.put("text", new String(out.toByteArray(), StandardCharsets.UTF_8));
                    call.resolve(r);
                } finally { c.disconnect(); }
            } catch (Exception e) { call.reject("No connection: " + e.getMessage()); }
        }).start();
    }

    /** Downloads the new APK, then opens Android's own "Update this app?" screen. */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url", "");
        new Thread(() -> {
            File dir = new File(getContext().getCacheDir(), "update");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File apk = new File(dir, "VoyagerVault-update.apk");
            try {
                HttpURLConnection c = open(url);
                long total = c.getContentLengthLong(), got = 0;
                int lastPct = -1;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        got += n;
                        int pct = total > 0 ? (int) (got * 100 / total) : -1;
                        if (pct != lastPct && pct % 5 == 0) {
                            lastPct = pct;
                            JSObject ev = new JSObject(); ev.put("pct", pct);
                            notifyListeners("updateProgress", ev);
                        }
                    }
                } finally { c.disconnect(); }
                if (total > 0 && got != total) throw new Exception("Download incomplete");
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().runOnUiThread(() -> {
                    try { getActivity().startActivity(i); call.resolve(); }
                    catch (Exception e) { call.reject("Could not open the installer: " + e.getMessage()); }
                });
            } catch (Exception e) { call.reject(e.getMessage() == null ? "Download failed" : e.getMessage()); }
        }).start();
    }
}
