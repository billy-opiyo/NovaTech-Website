package com.nurava.hubstores;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.pm.PackageInfoCompat;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Validates update channel URLs and APK identity before Android's installer is opened. */
final class UpdateApkVerifier {
    static final String PRODUCTION_CHANNEL = "production";
    static final String PACKAGE_ID = "com.nurava.hubstores";
    static final String PRODUCTION_HOST = "nuravahubstores.com";
    static final String PRODUCTION_APK_PATH = "/downloads/nurava-hubstores-production.apk";

    private UpdateApkVerifier() {}

    static String channelForServerUrl(String serverUrl) {
        Uri server = Uri.parse(serverUrl == null ? "" : serverUrl);
        if (!"https".equalsIgnoreCase(server.getScheme()) || server.getUserInfo() != null
            || (server.getPort() != -1 && server.getPort() != 443)) return null;
        if (PRODUCTION_HOST.equalsIgnoreCase(server.getHost())) return PRODUCTION_CHANNEL;
        return null;
    }

    static boolean isAllowedApkUrl(String channel, String serverUrl, String apkUrl) {
        String serverChannel = channelForServerUrl(serverUrl);
        if (serverChannel == null || !serverChannel.equals(channel) || apkUrl == null) return false;
        Uri server = Uri.parse(serverUrl);
        Uri apk = Uri.parse(apkUrl);
        return PRODUCTION_CHANNEL.equals(channel)
            && "https".equalsIgnoreCase(apk.getScheme())
            && apk.getUserInfo() == null
            && (apk.getPort() == -1 || apk.getPort() == 443)
            && server.getHost() != null
            && server.getHost().equalsIgnoreCase(apk.getHost())
            && PRODUCTION_APK_PATH.equals(apk.getPath())
            && apk.getFragment() == null;
    }

    static String normalizeSha256(String value) {
        if (value == null) return null;
        String normalized = value.replace(":", "").replace(" ", "").trim().toLowerCase(Locale.ROOT);
        return normalized.matches("[0-9a-f]{64}") ? normalized : null;
    }

    static Set<String> signerFingerprints(PackageInfo packageInfo) throws Exception {
        Set<String> fingerprints = new HashSet<>();
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (packageInfo.signingInfo == null) return fingerprints;
            signatures = packageInfo.signingInfo.getApkContentsSigners();
        } else {
            signatures = packageInfo.signatures;
        }
        if (signatures == null || signatures.length == 0) return fingerprints;

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (Signature signature : signatures) {
            byte[] hash = digest.digest(signature.toByteArray());
            StringBuilder value = new StringBuilder(hash.length * 2);
            for (byte item : hash) value.append(String.format(Locale.ROOT, "%02x", item & 0xff));
            fingerprints.add(value.toString());
        }
        return fingerprints;
    }

    static boolean installedSignerMatches(Context context, String expectedCertificateSha256) {
        String expected = normalizeSha256(expectedCertificateSha256);
        if (expected == null) return false;
        try {
            PackageManager packageManager = context.getPackageManager();
            PackageInfo installed = getPackageInfo(packageManager, context.getPackageName());
            Set<String> fingerprints = signerFingerprints(installed);
            return fingerprints.size() == 1 && fingerprints.contains(expected);
        } catch (Exception ignored) {
            return false;
        }
    }

    static boolean verifyDownloadedApk(
        Context context,
        Uri downloadUri,
        String channel,
        String appServerUrl,
        String apkUrl,
        String packageId,
        long expectedVersionCode,
        String expectedCertificateSha256
    ) {
        String expectedCertificate = normalizeSha256(expectedCertificateSha256);
        if (downloadUri == null || expectedCertificate == null || !PACKAGE_ID.equals(packageId)
            || !packageId.equals(context.getPackageName()) || expectedVersionCode < 1L
            || !isAllowedApkUrl(channel, appServerUrl, apkUrl)
            || !installedSignerMatches(context, expectedCertificate)) return false;

        File cachedApk = null;
        try (InputStream input = context.getContentResolver().openInputStream(downloadUri)) {
            if (input == null) return false;
            cachedApk = File.createTempFile("nurava-update-", ".apk", context.getCacheDir());
            try (OutputStream output = new java.io.FileOutputStream(cachedApk)) {
                byte[] buffer = new byte[16 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }

            PackageManager packageManager = context.getPackageManager();
            PackageInfo candidate = getArchiveInfo(packageManager, cachedApk.getAbsolutePath());
            if (candidate == null || !packageId.equals(candidate.packageName)
                || PackageInfoCompat.getLongVersionCode(candidate) != expectedVersionCode) return false;

            Set<String> candidateSigners = signerFingerprints(candidate);
            Set<String> installedSigners = signerFingerprints(getPackageInfo(packageManager, context.getPackageName()));
            return candidateSigners.size() == 1
                && installedSigners.size() == 1
                && candidateSigners.contains(expectedCertificate)
                && candidateSigners.equals(installedSigners);
        } catch (Exception ignored) {
            return false;
        } finally {
            if (cachedApk != null && cachedApk.exists()) cachedApk.delete();
        }
    }

    private static PackageInfo getPackageInfo(PackageManager packageManager, String packageName) throws PackageManager.NameNotFoundException {
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        return packageManager.getPackageInfo(packageName, flags);
    }

    private static PackageInfo getArchiveInfo(PackageManager packageManager, String apkPath) {
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        return packageManager.getPackageArchiveInfo(apkPath, flags);
    }
}
