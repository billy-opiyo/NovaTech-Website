package com.nurava.hubstores;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;

/** Hands a completed update APK to the foreground activity to open Android's installer. */
public class UpdateDownloadReceiver extends BroadcastReceiver {
    public interface InstallListener {
        void onUpdateDownloaded(Uri apkUri);
    }

    private final InstallListener installListener;

    public UpdateDownloadReceiver(InstallListener installListener) {
        this.installListener = installListener;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
        if (downloadId < 0L) return;

        long expectedDownloadId = context.getSharedPreferences("app_update", Context.MODE_PRIVATE)
            .getLong("pending_download_id", -1L);
        if (downloadId != expectedDownloadId) return;

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return;

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) return;
            int statusColumn = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int titleColumn = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
            if (statusColumn < 0 || titleColumn < 0
                || cursor.getInt(statusColumn) != DownloadManager.STATUS_SUCCESSFUL
                || !"Nurava HubStores update".equals(cursor.getString(titleColumn))) return;

            Uri apkUri = manager.getUriForDownloadedFile(downloadId);
            if (apkUri == null) return;
            android.content.SharedPreferences preferences = context.getSharedPreferences("app_update", Context.MODE_PRIVATE);
            String appServerUrl = preferences.getString("pending_server_url", "");
            int uriColumn = cursor.getColumnIndex(DownloadManager.COLUMN_URI);
            String apkUrl = uriColumn >= 0 ? cursor.getString(uriColumn) : null;
            boolean compatible = UpdateApkVerifier.verifyDownloadedApk(
                context,
                apkUri,
                preferences.getString("pending_channel", ""),
                appServerUrl,
                apkUrl,
                preferences.getString("pending_application_id", ""),
                preferences.getLong("pending_version_code", -1L),
                preferences.getString("pending_certificate_sha256", "")
            );
            if (!compatible) {
                manager.remove(downloadId);
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
                if (context instanceof MainActivity) {
                    android.widget.Toast.makeText(context, "The downloaded update does not match this app and was discarded.", android.widget.Toast.LENGTH_LONG).show();
                }
                return;
            }
            if (installListener != null) installListener.onUpdateDownloaded(apkUri);
        } catch (RuntimeException ignored) {
            // A failed DownloadManager lookup must not crash the app process.
        }
    }
}
