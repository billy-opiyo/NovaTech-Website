package com.nurava.hubstores;

import android.net.Uri;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.app.DownloadManager;
import android.content.IntentFilter;
import android.content.Intent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;
import android.widget.ImageView;
import java.util.Locale;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_INSTALL_PERMISSION = 8012;
    private View nativeLaunchOverlay;
    private UpdateDownloadReceiver updateDownloadReceiver;
    private Uri pendingUpdateApk;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
        showNativeLaunchOverlay();
    }

    @Override
    protected void load() {
        super.load();

        if (getBridge() == null) return;

        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);

        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && isConnectionError(error.getErrorCode(), String.valueOf(error.getDescription()))) {
                    showOfflinePage(view, request.getUrl().toString());
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Keep the native glass splash visible until the website has
                // rendered its own splash or the bundled offline page.
                view.postDelayed(MainActivity.this::hideNativeLaunchOverlay, 180);
            }

            private void showOfflinePage(WebView view, String failedUrl) {
                if (failedUrl == null || failedUrl.isEmpty()) return;
                // The app loads the website from Vercel, but this fallback is
                // bundled in the APK. A remote /offline.html URL does not exist.
                android.content.SharedPreferences theme = MainActivity.this.getSharedPreferences("active_theme", MODE_PRIVATE);
                Uri.Builder offlineUri = Uri.parse("file:///android_asset/public/offline.html")
                    .buildUpon()
                    .appendQueryParameter("url", failedUrl);
                appendThemeColor(offlineUri, theme, "background");
                appendThemeColor(offlineUri, theme, "surface");
                appendThemeColor(offlineUri, theme, "text");
                appendThemeColor(offlineUri, theme, "muted");
                appendThemeColor(offlineUri, theme, "primary");
                appendThemeGlassBackground(offlineUri, theme);
                if (theme.contains("light_icons")) {
                    offlineUri.appendQueryParameter("lightIcons", Boolean.toString(theme.getBoolean("light_icons", false)));
                }
                view.loadUrl(offlineUri.build().toString());
            }

            private void appendThemeColor(Uri.Builder uri, android.content.SharedPreferences theme, String key) {
                String value = theme.getString(key, null);
                if (value != null && value.matches("#[0-9a-fA-F]{6}")) {
                    uri.appendQueryParameter(key, value);
                }
            }

            private void appendThemeGlassBackground(Uri.Builder uri, android.content.SharedPreferences theme) {
                String value = theme.getString("glass_background", null);
                if (value != null && value.matches("rgba?\\(\\s*[0-9.]+\\s*,\\s*[0-9.]+\\s*,\\s*[0-9.]+(\\s*,\\s*[0-9.]+)?\\s*\\)")) {
                    uri.appendQueryParameter("glassBackground", value);
                }
            }

            private boolean isConnectionError(int errorCode, String description) {
                String normalizedDescription = description == null ? "" : description.toLowerCase(Locale.ROOT);
                return errorCode == ERROR_HOST_LOOKUP
                    || errorCode == ERROR_CONNECT
                    || errorCode == ERROR_TIMEOUT
                    || errorCode == ERROR_IO
                    || errorCode == ERROR_FAILED_SSL_HANDSHAKE
                    || normalizedDescription.contains("err_internet_disconnected");
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        if (updateDownloadReceiver == null) {
            updateDownloadReceiver = new UpdateDownloadReceiver(this::installDownloadedUpdate);
            IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                // DownloadManager is a separate privileged app, so NOT_EXPORTED can
                // prevent its completion broadcast from reaching this receiver.
                registerReceiver(updateDownloadReceiver, filter, android.content.Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(updateDownloadReceiver, filter);
            }
        }
        clearPendingUpdateIfInstalled();
        recoverCompletedUpdateDownload();
    }

    @Override
    public void onPause() {
        if (updateDownloadReceiver != null) {
            unregisterReceiver(updateDownloadReceiver);
            updateDownloadReceiver = null;
        }
        super.onPause();
    }

    private void recoverCompletedUpdateDownload() {
        if (pendingUpdateApk != null || updateDownloadReceiver == null) return;
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        boolean awaitingPermission = preferences.getBoolean("awaiting_install_permission", false);
        if (awaitingPermission) {
            // Android may recreate this Activity while the user is in Settings.
            // Resume automatic installation only after permission is granted;
            // if it is still denied, leave the completed download available for
            // an explicit retry from the in-app update prompt.
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
                && !getPackageManager().canRequestPackageInstalls()) return;
            preferences.edit()
                .putBoolean("awaiting_install_permission", false)
                .putBoolean("installer_prompt_open", false)
                .commit();
        } else if (preferences.getBoolean("installer_prompt_open", false)) {
            // The package installer is already open. Do not reopen it if the
            // user cancels and returns to the app.
            return;
        }
        long downloadId = preferences.getLong("pending_download_id", -1L);
        if (downloadId < 0L) return;

        // The app may have been paused or killed when DownloadManager sent its
        // completion broadcast. Re-check the saved download whenever it resumes.
        Intent completedDownload = new Intent(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            .putExtra(DownloadManager.EXTRA_DOWNLOAD_ID, downloadId);
        updateDownloadReceiver.onReceive(this, completedDownload);
    }

    private void clearPendingUpdateDownload() {
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        long downloadId = preferences.getLong("pending_download_id", -1L);
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager != null && downloadId >= 0L) manager.remove(downloadId);
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

    private void clearPendingUpdateIfInstalled() {
        android.content.SharedPreferences preferences = getSharedPreferences("app_update", MODE_PRIVATE);
        long targetVersionCode = preferences.getLong("pending_version_code", -1L);
        if (targetVersionCode < 1L) return;
        try {
            android.content.pm.PackageInfo installed = getPackageManager().getPackageInfo(getPackageName(), 0);
            long installedVersionCode = androidx.core.content.pm.PackageInfoCompat.getLongVersionCode(installed);
            if (installedVersionCode >= targetVersionCode) clearPendingUpdateDownload();
        } catch (android.content.pm.PackageManager.NameNotFoundException ignored) {
            // Keep the saved download so the user can retry if package lookup is unavailable.
        }
    }

    public void installDownloadedUpdate(Uri apkUri) {
        if (apkUri == null) return;
        android.content.SharedPreferences update = getSharedPreferences("app_update", MODE_PRIVATE);
        if (!UpdateApkVerifier.verifyDownloadedApk(
            this,
            apkUri,
            update.getString("pending_channel", ""),
            update.getString("pending_server_url", ""),
            update.getString("pending_apk_url", ""),
            update.getString("pending_application_id", ""),
            update.getLong("pending_version_code", -1L),
            update.getString("pending_certificate_sha256", "")
        )) {
            clearPendingUpdateDownload();
            android.widget.Toast.makeText(this, "The downloaded update does not match this app and was discarded.", android.widget.Toast.LENGTH_LONG).show();
            return;
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
            && !getPackageManager().canRequestPackageInstalls()) {
            pendingUpdateApk = apkUri;
            getSharedPreferences("app_update", MODE_PRIVATE)
                .edit()
                .putBoolean("installer_prompt_open", true)
                .putBoolean("awaiting_install_permission", true)
                .apply();
            Intent settingsIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                .setData(Uri.parse("package:" + getPackageName()));
            startActivityForResult(settingsIntent, REQUEST_INSTALL_PERMISSION);
            return;
        }
        launchUpdateInstaller(apkUri);
    }

    private void launchUpdateInstaller(Uri apkUri) {
        getSharedPreferences("app_update", MODE_PRIVATE)
            .edit()
            .putBoolean("installer_prompt_open", true)
            .putBoolean("awaiting_install_permission", false)
            .apply();
        Intent installIntent = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(installIntent);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_INSTALL_PERMISSION || pendingUpdateApk == null) return;
        Uri apkUri = pendingUpdateApk;
        pendingUpdateApk = null;
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O
            || getPackageManager().canRequestPackageInstalls()) {
            launchUpdateInstaller(apkUri);
        } else {
            android.widget.Toast.makeText(this, "Allow Nurava HubStores to install updates, then tap Open installer in the app.", android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private void showNativeLaunchOverlay() {
        FrameLayout content = findViewById(android.R.id.content);
        if (content == null || getBridge() == null || getBridge().getWebView() == null) return;

        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackground(createNativeLaunchBackground());
        overlay.setClickable(true);
        overlay.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.launch_icon);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setBackground(new android.graphics.drawable.GradientDrawable());
        logo.setClipToOutline(true);
        logo.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, android.graphics.Outline outline) {
                outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), view.getWidth() * 0.27f);
            }
        });
        int logoWidth = dp(96);
        int logoHeight = dp(96);
        FrameLayout.LayoutParams logoLayout = new FrameLayout.LayoutParams(logoWidth, logoHeight, Gravity.CENTER);
        overlay.addView(logo, logoLayout);

        FrameLayout.LayoutParams overlayLayout = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        content.addView(overlay, overlayLayout);
        nativeLaunchOverlay = overlay;
    }

    private Drawable createNativeLaunchBackground() {
        android.content.SharedPreferences theme = getSharedPreferences("active_theme", MODE_PRIVATE);
        int backgroundColor = readThemeColor(theme, "background", "#061626");
        int surfaceColor = readThemeColor(theme, "surface", "#0B233A");
        int primaryColor = readThemeColor(theme, "primary", "#F97316");

        GradientDrawable background = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[] { surfaceColor, backgroundColor }
        );
        background.setShape(GradientDrawable.RECTANGLE);

        GradientDrawable frame = new GradientDrawable();
        frame.setShape(GradientDrawable.RECTANGLE);
        frame.setCornerRadius(dp(26));
        frame.setColor(Color.argb(
            0x99,
            Color.red(surfaceColor),
            Color.green(surfaceColor),
            Color.blue(surfaceColor)
        ));
        frame.setStroke(dp(1), Color.argb(
            0x33,
            Color.red(primaryColor),
            Color.green(primaryColor),
            Color.blue(primaryColor)
        ));

        LayerDrawable launchBackground = new LayerDrawable(new Drawable[] { background, frame });
        int frameInset = dp(12);
        launchBackground.setLayerInset(1, frameInset, frameInset, frameInset, frameInset);
        return launchBackground;
    }

    private int readThemeColor(android.content.SharedPreferences theme, String key, String fallback) {
        String value = theme.getString(key, fallback);
        if (value == null || !value.matches("#[0-9a-fA-F]{6}")) value = fallback;
        return Color.parseColor(value);
    }

    private void hideNativeLaunchOverlay() {
        if (nativeLaunchOverlay == null) return;
        FrameLayout content = findViewById(android.R.id.content);
        if (content == null) return;

        View overlay = nativeLaunchOverlay;
        nativeLaunchOverlay = null;
        overlay.animate()
            .alpha(0f)
            .setDuration(180)
            .withEndAction(() -> content.removeView(overlay))
            .start();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
