package com.nurava.hubstores;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Settings;

/** Opens Android's install confirmation as soon as this app's APK finishes downloading. */
public class UpdateDownloadReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
        if (downloadId < 0L) return;

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
            Intent installIntent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(apkUri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            try {
                context.startActivity(installIntent);
            } catch (SecurityException | android.content.ActivityNotFoundException blocked) {
                // The DownloadManager completion notification remains available as a fallback.
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:" + context.getPackageName()))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        context.startActivity(settingsIntent);
                    } catch (RuntimeException ignored) {
                        // Android may block background activity starts; the system download notification is retained.
                    }
                }
            }
        } catch (RuntimeException ignored) {
            // A failed DownloadManager lookup must not crash the app process.
        }
    }
}
