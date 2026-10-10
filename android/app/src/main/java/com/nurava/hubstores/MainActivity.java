package com.nurava.hubstores;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import java.util.Locale;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
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
}
