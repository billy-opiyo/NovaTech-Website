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
            if (installListener != null) installListener.onUpdateDownloaded(apkUri);
        } catch (RuntimeException ignored) {
            // A failed DownloadManager lookup must not crash the app process.
        }
    }
}
