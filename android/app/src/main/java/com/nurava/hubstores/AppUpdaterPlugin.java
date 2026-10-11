package com.nurava.hubstores;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Environment;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    @PluginMethod
    public void getDownloadStatus(PluginCall call) {
        Long requestedDownloadId = call.getLong("downloadId");
        if (requestedDownloadId == null || requestedDownloadId < 0L) {
            call.reject("The app update download ID is invalid.");
            return;
        }

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("Android could not check the update download.");
            return;
        }

        String status = "failed";
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(requestedDownloadId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor != null && cursor.moveToFirst()) {
                int statusColumn = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                int titleColumn = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
                if (statusColumn < 0 || titleColumn < 0
                    || !"Nurava HubStores update".equals(cursor.getString(titleColumn))) {
                    call.reject("The app update download could not be verified.");
                    return;
                }

                switch (cursor.getInt(statusColumn)) {
                    case DownloadManager.STATUS_PENDING:
                    case DownloadManager.STATUS_RUNNING:
                        status = "running";
                        break;
                    case DownloadManager.STATUS_PAUSED:
                        status = "paused";
                        break;
                    case DownloadManager.STATUS_SUCCESSFUL:
                        status = "downloaded";
                        break;
                    case DownloadManager.STATUS_FAILED:
                    default:
                        status = "failed";
                        break;
                }
            }
        } catch (RuntimeException error) {
            call.reject("Android could not check the update download.", error);
            return;
        }

        if ("failed".equals(status)) {
            android.content.SharedPreferences preferences = getContext()
                .getSharedPreferences("app_update", Context.MODE_PRIVATE);
            if (preferences.getLong("pending_download_id", -1L) == requestedDownloadId) {
                preferences.edit().remove("pending_download_id").apply();
            }
        }

        JSObject result = new JSObject();
        result.put("status", status);
        call.resolve(result);
    }

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url");
        String versionName = call.getString("versionName", "latest");
        Object versionCodeValue = call.getData().opt("versionCode");
        Long targetVersionCode = null;
        if (versionCodeValue instanceof Number) {
            Number numericVersionCode = (Number) versionCodeValue;
            long integralVersionCode = numericVersionCode.longValue();
            if (numericVersionCode.doubleValue() == (double) integralVersionCode) {
                targetVersionCode = integralVersionCode;
            }
        } else if (versionCodeValue instanceof String) {
            try {
                targetVersionCode = Long.parseLong((String) versionCodeValue);
            } catch (NumberFormatException ignored) {
                // Invalid version values are rejected below with the other incomplete details.
            }
        }

        if (url == null || targetVersionCode == null || targetVersionCode <= 0) {
            call.reject("The app update details are incomplete.");
            return;
        }

        Uri apkUri = Uri.parse(url);
        Uri appUri = Uri.parse(getBridge().getServerUrl());
        String expectedApkPath = "/downloads/nurava-hubstores-staging.apk";
        if (!"https".equalsIgnoreCase(apkUri.getScheme())
            || appUri.getHost() == null
            || !appUri.getHost().equalsIgnoreCase(apkUri.getHost())
            || !expectedApkPath.equals(apkUri.getPath())) {
            call.reject("The update download URL is not allowed.");
            return;
        }

        try {
            PackageInfo installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long installedVersionCode = PackageInfoCompat.getLongVersionCode(installed);
            if (targetVersionCode <= installedVersionCode) {
                call.reject("This app is already up to date.");
                return;
            }

            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                call.reject("Android could not start the update download.");
                return;
            }

            String safeVersion = versionName.replaceAll("[^A-Za-z0-9._-]", "_");
            DownloadManager.Request request = new DownloadManager.Request(apkUri)
                .setTitle("Nurava HubStores update")
                .setDescription("Downloading app version " + safeVersion)
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    "nurava-hubstores-update-v" + targetVersionCode + ".apk"
                );
            long downloadId = manager.enqueue(request);
            boolean savedDownload = getContext()
                .getSharedPreferences("app_update", Context.MODE_PRIVATE)
                .edit()
                .putLong("pending_download_id", downloadId)
                .commit();
            if (!savedDownload) {
                manager.remove(downloadId);
                call.reject("Android could not prepare the automatic installer.");
                return;
            }

            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Android could not start the update download.", error);
        }
    }
}
