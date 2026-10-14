package com.nurava.hubstores;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
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
    public void getPendingUpdate(PluginCall call) {
        Long requestedVersionCode = call.getLong("versionCode");
        String requestedChannel = call.getString("channel");
        String requestedCertificate = UpdateApkVerifier.normalizeSha256(call.getString("signingCertificateSha256"));
        if (requestedVersionCode == null || requestedVersionCode < 1L) {
            call.reject("The app update version code is invalid.");
            return;
        }

        android.content.SharedPreferences preferences = getContext()
            .getSharedPreferences("app_update", Context.MODE_PRIVATE);
        long downloadId = preferences.getLong("pending_download_id", -1L);
        long pendingVersionCode = preferences.getLong("pending_version_code", -1L);
        String pendingChannel = preferences.getString("pending_channel", "");
        String pendingCertificate = preferences.getString("pending_certificate_sha256", "");
        JSObject result = new JSObject();
        if (downloadId >= 0L && pendingVersionCode == requestedVersionCode
            && requestedChannel != null && requestedChannel.equals(pendingChannel)
            && requestedCertificate != null && requestedCertificate.equals(pendingCertificate)) {
            result.put("downloadId", downloadId);
        } else {
            result.put("downloadId", JSObject.NULL);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void checkUpdateCompatibility(PluginCall call) {
        String channel = call.getString("channel");
        String packageId = call.getString("applicationId");
        String certificate = UpdateApkVerifier.normalizeSha256(call.getString("signingCertificateSha256"));
        Long versionCode = call.getLong("versionCode");
        boolean compatible = versionCode != null
            && versionCode > 0L
            && versionCode > getInstalledVersionCode()
            && UpdateApkVerifier.PACKAGE_ID.equals(packageId)
            && packageId.equals(getContext().getPackageName())
            && channel != null
            && channel.equals(UpdateApkVerifier.channelForServerUrl(getBridge().getServerUrl()))
            && certificate != null
            && UpdateApkVerifier.installedSignerMatches(getContext(), certificate);
        JSObject result = new JSObject();
        result.put("compatible", compatible);
        call.resolve(result);
    }

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
                        status = isDownloadedUpdateCompatible(requestedDownloadId, cursor)
                            ? "downloaded"
                            : "failed";
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
                manager.remove(requestedDownloadId);
                preferences.edit()
                    .remove("pending_download_id")
                    .remove("pending_version_code")
                    .remove("pending_channel")
                    .remove("pending_server_url")
                    .remove("pending_apk_url")
                    .remove("pending_application_id")
                    .remove("pending_certificate_sha256")
                    .remove("awaiting_install_permission")
                    .remove("installer_prompt_open")
                    .apply();
            }
        }

        JSObject result = new JSObject();
        result.put("status", status);
        call.resolve(result);
    }

    @PluginMethod
    public void openDownloadedUpdate(PluginCall call) {
        Long requestedDownloadId = call.getLong("downloadId");
        if (requestedDownloadId == null || requestedDownloadId < 0L) {
            call.reject("The app update download ID is invalid.");
            return;
        }

        android.content.SharedPreferences preferences = getContext()
            .getSharedPreferences("app_update", Context.MODE_PRIVATE);
        if (preferences.getLong("pending_download_id", -1L) != requestedDownloadId) {
            call.reject("This app update download is no longer available.");
            return;
        }

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("Android could not open the downloaded update.");
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(requestedDownloadId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                call.reject("The downloaded app update could not be found.");
                return;
            }
            int statusColumn = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int titleColumn = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
            if (statusColumn < 0 || titleColumn < 0
                || cursor.getInt(statusColumn) != DownloadManager.STATUS_SUCCESSFUL
                || !"Nurava HubStores update".equals(cursor.getString(titleColumn))) {
                call.reject("The downloaded file is not a completed Nurava HubStores update.");
                return;
            }

            Uri apkUri = manager.getUriForDownloadedFile(requestedDownloadId);
            if (apkUri == null || !isDownloadedUpdateCompatible(requestedDownloadId, cursor)
                || !(getActivity() instanceof MainActivity)) {
                call.reject("Android could not open the downloaded update.");
                return;
            }
            getActivity().runOnUiThread(() -> ((MainActivity) getActivity()).installDownloadedUpdate(apkUri));
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("Android could not open the downloaded update.", error);
        }
    }

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url");
        String versionName = call.getString("versionName", "latest");
        String channel = call.getString("channel");
        String packageId = call.getString("applicationId");
        String certificate = UpdateApkVerifier.normalizeSha256(call.getString("signingCertificateSha256"));
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

        if (url == null || channel == null || packageId == null || certificate == null
            || versionName == null || versionName.trim().isEmpty()
            || targetVersionCode == null || targetVersionCode <= 0) {
            call.reject("The app update details are incomplete.");
            return;
        }

        String appServerUrl = getBridge().getServerUrl();
        Uri apkUri = Uri.parse(url);
        if (!UpdateApkVerifier.isAllowedApkUrl(channel, appServerUrl, url)
            || !UpdateApkVerifier.PACKAGE_ID.equals(packageId)
            || !packageId.equals(getContext().getPackageName())
            || !channel.equals(UpdateApkVerifier.channelForServerUrl(appServerUrl))
            || !UpdateApkVerifier.installedSignerMatches(getContext(), certificate)) {
            call.reject("The update download URL is not allowed.");
            return;
        }

        try {
            long installedVersionCode = getInstalledVersionCode();
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
                .putLong("pending_version_code", targetVersionCode)
                .putString("pending_channel", channel)
                .putString("pending_server_url", appServerUrl)
                .putString("pending_apk_url", url)
                .putString("pending_application_id", packageId)
                .putString("pending_certificate_sha256", certificate)
                .putBoolean("awaiting_install_permission", false)
                .putBoolean("installer_prompt_open", false)
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

    private long getInstalledVersionCode() {
        try {
            PackageInfo installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return PackageInfoCompat.getLongVersionCode(installed);
        } catch (PackageManager.NameNotFoundException ignored) {
            return -1L;
        }
    }

    private boolean isDownloadedUpdateCompatible(long downloadId, Cursor cursor) {
        android.content.SharedPreferences preferences = getContext()
            .getSharedPreferences("app_update", Context.MODE_PRIVATE);
        int uriColumn = cursor.getColumnIndex(DownloadManager.COLUMN_URI);
        String apkUrl = uriColumn >= 0 ? cursor.getString(uriColumn) : null;
        String channel = preferences.getString("pending_channel", "");
        String appServerUrl = preferences.getString("pending_server_url", "");
        String applicationId = preferences.getString("pending_application_id", "");
        String certificate = preferences.getString("pending_certificate_sha256", "");
        long versionCode = preferences.getLong("pending_version_code", -1L);
        long savedDownloadId = preferences.getLong("pending_download_id", -1L);
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        Uri downloadedUri = savedDownloadId == downloadId && manager != null
            ? manager.getUriForDownloadedFile(downloadId)
            : null;
        return downloadedUri != null
            && UpdateApkVerifier.verifyDownloadedApk(
                getContext(),
                downloadedUri,
                channel,
                appServerUrl,
                apkUrl,
                applicationId,
                versionCode,
                certificate
            );
    }
}
