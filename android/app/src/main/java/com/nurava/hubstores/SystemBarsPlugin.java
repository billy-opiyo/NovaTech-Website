package com.nurava.hubstores;

import android.graphics.Color;
import android.os.Build;
import android.os.Build.VERSION_CODES;
import android.content.Context;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;
import androidx.core.view.WindowCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    private FrameLayout edgeToEdgeColorBands;
    private View statusBarColorBand;
    private View navigationBarColorBand;

    @PluginMethod
    public void setColors(PluginCall call) {
        String colorValue = call.getString("color");
        Boolean lightIconsValue = call.getBoolean("lightIcons");
        if (colorValue == null || lightIconsValue == null) {
            call.reject("Theme color details are incomplete.");
            return;
        }

        String surfaceValue = call.getString("surface", colorValue);
        String textValue = call.getString("text", "#f8fafc");
        String mutedValue = call.getString("muted", "#cbd5e1");
        String primaryValue = call.getString("primary", "#f97316");
        final int color;
        final int surface;
        final int text;
        final int muted;
        final int primary;
        try {
            color = Color.parseColor(colorValue);
            surface = Color.parseColor(surfaceValue);
            text = Color.parseColor(textValue);
            muted = Color.parseColor(mutedValue);
            primary = Color.parseColor(primaryValue);
        } catch (IllegalArgumentException error) {
            call.reject("The theme palette is invalid.", error);
            return;
        }

        getContext().getSharedPreferences("active_theme", Context.MODE_PRIVATE)
            .edit()
            .putString("background", colorValue)
            .putString("surface", surfaceValue)
            .putString("text", textValue)
            .putString("muted", mutedValue)
            .putString("primary", primaryValue)
            .putBoolean("light_icons", lightIconsValue)
            .apply();

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            FrameLayout decor = (FrameLayout) window.getDecorView();
            decor.setBackgroundColor(color);
            if (Build.VERSION.SDK_INT >= 35) {
                // Android 15+ enforces edge-to-edge for apps targeting API 35+;
                // status/navigation bar color setters no longer paint those areas.
                WindowCompat.setDecorFitsSystemWindows(window, false);
                window.setStatusBarColor(Color.TRANSPARENT);
                window.setNavigationBarColor(Color.TRANSPARENT);
            } else {
                window.setStatusBarColor(color);
                window.setNavigationBarColor(color);
            }
            if (Build.VERSION.SDK_INT >= VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }
            boolean lightIcons = lightIconsValue;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    int appearance = lightIcons
                        ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                        : 0;
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    controller.setSystemBarsAppearance(appearance, mask);
                }
            } else {
                int flags = decor.getSystemUiVisibility();
                int lightBarFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                decor.setSystemUiVisibility(lightIcons ? flags | lightBarFlags : flags & ~lightBarFlags);
            }
            if (Build.VERSION.SDK_INT >= 35) {
                ensureEdgeToEdgeColorBands(decor);
                statusBarColorBand.setBackgroundColor(color);
                navigationBarColorBand.setBackgroundColor(color);
            }
        });
        call.resolve();
    }

    private void ensureEdgeToEdgeColorBands(FrameLayout decor) {
        if (edgeToEdgeColorBands != null) return;

        FrameLayout bands = new FrameLayout(getActivity());
        bands.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        bands.setClickable(false);
        bands.setFocusable(false);
        statusBarColorBand = new View(getActivity());
        navigationBarColorBand = new View(getActivity());
        bands.addView(statusBarColorBand, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            0,
            android.view.Gravity.TOP
        ));
        bands.addView(navigationBarColorBand, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            0,
            android.view.Gravity.BOTTOM
        ));
        bands.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset;
            int bottomInset;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars()
                );
                topInset = bars.top;
                bottomInset = bars.bottom;
            } else {
                topInset = insets.getSystemWindowInsetTop();
                bottomInset = insets.getSystemWindowInsetBottom();
            }
            FrameLayout.LayoutParams topLayout = (FrameLayout.LayoutParams) statusBarColorBand.getLayoutParams();
            topLayout.height = topInset;
            statusBarColorBand.setLayoutParams(topLayout);
            FrameLayout.LayoutParams bottomLayout = (FrameLayout.LayoutParams) navigationBarColorBand.getLayoutParams();
            bottomLayout.height = bottomInset;
            navigationBarColorBand.setLayoutParams(bottomLayout);
            return insets;
        });
        decor.addView(bands, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        bands.bringToFront();
        decor.requestApplyInsets();
        edgeToEdgeColorBands = bands;
    }
}
