package com.nurava.hubstores;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.view.Gravity;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;
import android.widget.ImageView;
import java.util.Locale;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private View nativeLaunchOverlay;

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

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                    showOfflinePage(view, request.getUrl().toString());
                    return;
                }
                super.onReceivedHttpError(view, request, response);
            }

            private void showOfflinePage(WebView view, String failedUrl) {
                if (failedUrl == null || failedUrl.isEmpty()) return;
                // The app loads the website from Vercel, but this fallback is
                // bundled in the APK. A remote /offline.html URL does not exist.
                String offlineUrl = "file:///android_asset/public/offline.html?url=" + Uri.encode(failedUrl);
                view.loadUrl(offlineUrl);
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

    private void showNativeLaunchOverlay() {
        FrameLayout content = findViewById(android.R.id.content);
        if (content == null || getBridge() == null || getBridge().getWebView() == null) return;

        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundResource(R.drawable.native_launch_background);
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
