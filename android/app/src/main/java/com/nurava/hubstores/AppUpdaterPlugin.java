package com.nurava.hubstores;

import android.app.DownloadManager;
import android.content.Context;
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
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url");
        String versionName = call.getString("versionName", "latest");
        Long targetVersionCode = call.getLong("versionCode");

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

            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Android could not start the update download.", error);
        }
    }
}
