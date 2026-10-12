# Android app (Capacitor)

Nurava HubStores uses the existing Next.js deployment inside a Capacitor Android WebView. The web app remains the only UI and business-logic source. Its server-rendered App Router pages, route handlers, Auth.js sessions, and Prisma access continue to run on the deployed Next.js server; Android calls that same HTTPS origin and database through the existing server routes.

When the remote app cannot load because of a main-frame DNS, connection, timeout, I/O, or TLS handshake error, the Android `MainActivity` WebView client opens the bundled `capacitor-shell/offline.html` fallback from `file:///android_asset/public/` instead of requesting `/offline.html` from the remote Vercel host. HTTP server errors are left to WebView so they are not mistaken for restored internet by the offline page's cross-origin connectivity probe. The active platform or storefront background, surface, text, muted, and primary colors are saved through the native system-bars plugin and passed to the bundled page, which validates them before applying them. A first launch with no previously saved theme uses the bundled default palette. The failing URL, including its route and query string, is passed to the fallback. It retries that exact URL immediately and every two seconds, retries when Android reports connectivity restored or the app returns to the foreground, and navigates back once reachable. The fallback mirrors the website's `OfflineNotice` dialog; the React component handles connection loss after the website has loaded.

The Android app uses the same deployed site and signed-in account as the browser, so platform font-size defaults and each user's saved font-size preference apply in the WebView automatically; website deployments do not require rebuilding the APK. Deploy database migration `0036_user_font_size_preference` before deploying the account-settings API change.

## In-app Android updates

The Android shell selects a channel-specific update feed from the exact HTTPS site origin: staging uses `/downloads/nurava-hubstores-update-staging.json` and `/downloads/nurava-hubstores-staging.apk`; production uses `/downloads/nurava-hubstores-update-production.json` and `/downloads/nurava-hubstores-production.apk`. It checks while the platform homepage is open, on foreground/visibility changes, and every three minutes. A feed must be enabled and match the channel, package ID, newer version, expected same-origin APK path, and SHA-256 signing-certificate fingerprint before the update prompt is shown. The production feed is disabled until a production signing identity is established. To enable it later, verify the production APK certificate against the established release identity, then set the dedicated production feed's enabled flag, version and production APK path together. Never place a staging APK or staging certificate in that feed. The older shared `/downloads/nurava-hubstores-update.json` remains as a legacy file but is no longer used by the channel-aware updater.

The native updater independently restricts each channel to its own APK path. Before showing an update prompt, the native plugin verifies that the installed package and signing certificate match the feed. Before opening Android's installer, it inspects the downloaded APK and verifies its package ID, exact target version, and signing certificate against the installed app. Android also enforces signing compatibility during installation. Android Download Manager shows download progress and a completion notification; when the app is in the foreground, the installer opens after a compatible APK finishes downloading. If the download finishes while the app is paused, the app checks the saved request on resume. Failed, cancelled, malformed, wrong-channel, wrong-version, or incompatible APKs are discarded and can be retried. A paused download can be resumed from Android's notification, and a completed download keeps an **Open installer** action available. Android still requires the user to confirm installation. Staging APKs that lack the native compatibility method are not offered in-app updates because their installed signer cannot be verified before prompting; upgrading those installations requires a separately trusted manual path. Production updates remain disabled until a production signing identity is established.

When a download starts, the selected HTTPS app origin is saved with its channel and APK identity. Completion broadcasts, resume recovery, and the final installer check reuse that saved origin, so validation does not depend on the Android broadcast context being the foreground Activity.

Changing Capacitor or native Android source does not itself change an APK already installed on a phone. After making native changes, run `npm run android:staging:update`. This command increments `versionCode` and the patch part of `versionName`, builds a debug-signed staging APK, verifies that its package, staging URL, version and certificate match the current staging channel, then prepares the APK and `/downloads/nurava-hubstores-update-staging.json`. It refuses to replace the staging APK if the debug signing identity changed. The legacy shared update manifest is left untouched. Deploy the web code, staging APK and staging manifest together when approved; this audit does not publish them. Website-only changes still do not need a new APK. Android continues to reject an APK update signed by an incompatible key.

This project is not statically exported: page rendering and API routes use server-only Next.js and Prisma features. The Android shell therefore needs an internet connection. Android build commands select one of two fixed HTTPS origins: staging uses `https://nuravatech-saas-staging.vercel.app`; production uses `https://nuravahubstores.com`. The production domain is a configured target and must be purchased, deployed, and verified before a production APK can load it. `CAPACITOR_BUILD_TARGET` is required when invoking Capacitor directly, and any `CAPACITOR_SERVER_URL` override must exactly match that target. Capacitor documents `server.url` primarily for live reload, so review Google Play's current WebView app requirements before preparing a production app.

## Existing architecture audit

- Next.js 15 App Router with React 19 and strict TypeScript; the project uses both server and client components.
- Next.js route handlers under `frontend/src/app/api` share the app's server-side Prisma client and PostgreSQL database. There is no separate Android API or database.
- Auth.js v5 beta uses JWT sessions in cookies. Credentials and Google providers use the same user records and session checks; middleware protects `/account`, `/manage`, `/platform`, and `/admin` routes.
- Browser storage is used for theme, cart, compare products, and a few request preferences. The web app also uses multipart image uploads to existing authenticated API routes.
- The app uses HTTPS payment providers and server callbacks (M-Pesa and Stripe); there are no service workers or WebSockets in the application source.
- Capacitor keeps the same deployed hostname in the WebView so cookies and same-origin API calls use the existing authentication and backend. External URLs continue to open in the device browser by default.

## Build setup

Prerequisites: Node.js 22 or newer, Android Studio 2025.2.1 or newer with Android SDK API 36 and build tools installed, and JDK 21. The Capacitor 8.5.3 Android sources compile for Java 21. Android Studio includes a JDK; select JDK 21 for Gradle rather than a newer system JDK. Then, from the repository root:

```powershell
npm install
npm run android:add # First-time setup only, when android/ has not been added yet
npm run android:sync
npm run android:open
```

Existing projects with an `android/` directory should skip `android:add` and use the explicit npm scripts below.

Use the explicit staging commands for staging APK work and the release commands for the production target:

```powershell
npm run android:sync
npm run android:debug
npm run android:staging:update
npm run android:open
npm run android:sync:production
npm run android:open:production
npm run android:release:apk
npm run android:release:aab
```

The staging commands bind the Capacitor URL to `https://nuravatech-saas-staging.vercel.app`; the release commands bind it to `https://nuravahubstores.com`. If `CAPACITOR_BUILD_TARGET` or `CAPACITOR_SERVER_URL` is already set to a conflicting value, the command stops with an error. Direct `npx cap sync android` calls require `CAPACITOR_BUILD_TARGET` (`staging` or `production`); if `CAPACITOR_SERVER_URL` is set, it must match the selected target. Do not use HTTP or commit environment secrets.

### When a new APK is needed

The installed Android app loads the website from the configured HTTPS deployment. Website-only changes (pages, components, styles, and server/API behavior) become available in the app after they are deployed to that site and the app reloads; they do not require rebuilding or reinstalling the APK. For this staging setup, deploy the website changes to `saas-staging` so they reach `https://nuravatech-saas-staging.vercel.app`.

Rebuild and reinstall the APK when changing the native Android shell, such as its icon, native launch screen, permissions, Capacitor plugins, or the app's configured URL. The APK already installed on a device does not update when the website's remote code changes.

Build a debug APK:

```powershell
Set-Location "C:\Users\Billy\MY WEB PROJECTS\NovaTech Website"

# Point these at your installed JDK 21 and Android SDK.
$env:JAVA_HOME = "C:\Path\To\JDK-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

npm run android:debug
```

`npm run android:debug` syncs the staging Capacitor configuration and builds the APK. Sync must report both `@capacitor/app` and `@capacitor/browser` as Android plugins. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. To open Android Studio with an explicitly selected target, use `npm run android:open` for staging or `npm run android:open:production` for production; each command syncs that target first. Direct Gradle release tasks do not carry the required launcher marker and fail; use the release npm scripts below so the completed artifact is verified.

After changing Capacitor/native files, create a new versioned staging APK and matching update manifest with:

```powershell
npm run android:staging:update
```

The command requires the configured JDK 21 and Android SDK. Commit and deploy the files it updates; building locally alone does not notify installed apps. Users who already installed the app must confirm Android's install prompt to receive native changes. This debug APK is for staging and sideload testing; use a signed release APK/AAB for distribution.

Build a release APK or Play Store AAB with the production target selected:

```powershell
npm run android:release:apk
npm run android:release:aab
```

Production release builds fail before Capacitor sync unless all four local signing variables are present: `NURAVA_ANDROID_KEYSTORE`, `NURAVA_ANDROID_STORE_PASSWORD`, `NURAVA_ANDROID_KEY_ALIAS`, and `NURAVA_ANDROID_KEY_PASSWORD`. The keystore path must be absolute and point to an existing file outside the repository. Also set `NURAVA_ANDROID_EXPECTED_CERT_SHA256` to the approved production signing certificate's SHA-256 fingerprint (64 hexadecimal characters; colons are accepted). This fingerprint is public certificate identity data, not a password. The release commands do not print signing variable values.

Production APK/AAB generation is additionally disabled unless the current build process has `NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED=1`. Leave this unset while `https://nuravahubstores.com` is not deployed. Set it only for an explicitly approved production release after confirming the production site is live and the signing identity is established. This is a local build gate; it does not modify Vercel or production environment variables.

Before preparing production signing, establish whether a valid existing production key must be preserved. Check the approved secret manager/build machine and, if the app was ever distributed, its release archive and Google Play Console **App integrity** page. Compare the certificate fingerprint of any prior APK with the Play Console app-signing and upload certificates. Never create a replacement key while an existing distribution identity remains unresolved. If no production key exists and no previous release requires it, create a dedicated production key in a protected, encrypted location outside the repository. For example, after creating a protected directory and setting `NURAVA_ANDROID_KEYSTORE` to its absolute keystore path, run this command from PowerShell; keytool prompts for passwords rather than putting them in command history:

```powershell
keytool -genkeypair -v -keystore "$env:NURAVA_ANDROID_KEYSTORE" -alias nurava-production -keyalg RSA -keysize 4096 -validity 10000
keytool -list -v -keystore "$env:NURAVA_ANDROID_KEYSTORE" -alias nurava-production
```

Record the displayed SHA-256 certificate fingerprint as `NURAVA_ANDROID_EXPECTED_CERT_SHA256`. Store at least one encrypted offline backup separately from the build machine, restrict access to both copies, and verify a backup can be restored before relying on it. Never copy the password into a command argument, commit the keystore or credentials, or reuse the staging/debug signing key for production.

Production release commands require Android SDK verification tools (`apksigner` and `aapt` for APKs; `bundletool` for AABs) plus Java `jarsigner` and `keytool` for AABs. The APK/AAB is checked against the pinned certificate fingerprint, package ID `com.nurava.hubstores`, version in `android/app/build.gradle`, and the embedded Capacitor config for `https://nuravahubstores.com` with cleartext disabled. The APK copy is also verified against the same checks. Verification failure makes the npm release command fail; inspect and explicitly approve any artifact before distributing it.

The AAB is written to `android/app/build/outputs/bundle/release/app-release.aab`; the signed APK is copied to `android/app/build/outputs/apk/release/nurava-hubstores.apk` for direct distribution. These paths are build outputs and are not produced by the verification tests. The debug-signed staging APK remains the sideload/update artifact for existing staging installs.

## Android-specific behavior and remaining release work

`AndroidBackButtonHandler` listens only when running as Android and sends system back through browser history. At the first page it opens a centered, theme-aware confirmation dialog with Cancel, Exit, and a close button. Android's native back button closes the dialog; Exit closes the app. `AndroidPullToRefresh` enables a downward swipe from the top of the document to reload the current route, shows a themed pull/reload indicator, and ignores gestures that start inside a vertically scrollable panel. The `@capacitor/app` and `@capacitor/browser` plugins provide Android app-link handling and the secure external-browser OAuth flow.

### Android permissions and device capabilities

The manifest currently requests `INTERNET` for the shared remote site/API and `REQUEST_INSTALL_PACKAGES` for the user-confirmed staging APK updater. Image upload controls use standard WebView file inputs, which open Android's system picker and receive access to the selected file URI; broad `READ_MEDIA_*` or legacy storage permissions are not required for that flow. The native WebChrome file chooser handles those upload controls.

The current application has no camera capture, location, Firebase Cloud Messaging, or app-posted notification feature. The website notification center reads the shared authenticated API while open; it does not deliver background push notifications. Therefore no camera, location, or `POST_NOTIFICATIONS` permission has been added, and no push permission prompt is shown without a configured delivery feature. Android Download Manager owns the app-update download notification. If a future feature uses camera, location, or push, add its native implementation and request its permission only when the user invokes that feature.

The shared footer's Quick Links show **Open Website** inside the Android app; it opens the current route in the normal browser so users can continue to protected admin pages there. In a browser, that same footer item is **Open App**. On Android it sends the current HTTPS URL to the installed app using `com.nurava.hubstores://open`; if the app is missing, Android's intent fallback starts downloading the staging APK. On other desktop browsers the link directly downloads the APK. The Android receiver only accepts HTTPS links on the same origin as the app, then opens that exact route in the shared WebView.

The Android launcher icon density and adaptive-icon assets under `android/app/src/main/res/mipmap-*` are generated from `frontend/public/images/Nurava_HubStores_app_icon_logo.png`. The native launch window and the WebView's first frame use the platform's default dark navy (`#0F172A`) instead of a transparent/black window, and Android displays the launcher icon while starting the WebView. Once the WebView is ready, the existing `SplashScreen` component takes over and uses the configured glass mode, progress bar, logo, and percentage counter. Android's native launch window cannot render the React progress animation before the WebView is ready; native splash changes require a new APK. Scrollbar suppression is limited to the Android WebView by its native vertical-scrollbar setting and an Android-only document class; browser scrollbar styling is unchanged.

Google sign-in in Android opens the staging website's Auth.js flow in a Chrome Custom Tab, so the OAuth state cookies are created and returned in the same browser context. Because `capacitor.config.ts` is at the repository root, keep `@capacitor/core`, `@capacitor/app`, and `@capacitor/browser` in the root `package.json` as well as the frontend dependencies; `npm run android:sync` must report both the App and Browser plugins before building. After Google sign-in, `/api/auth/mobile-google/complete` issues a random, two-minute, single-use handoff ticket; Android receives it through `com.nurava.hubstores://auth/callback` and exchanges it through the existing Auth.js credentials flow to establish the normal app WebView session. The ticket is stored hashed in the existing `VerificationToken` table and consumed once; no separate account system or schema migration is used. Website sign-in continues using the ordinary Auth.js Google flow.

The Play Store review is not guaranteed for a WebView-led app: Google's current policy requires adequate app functionality and disallows a WebView of a site without the owner's permission. This app is for the existing Nurava commerce and merchant platform and the owner controls the site, but Play review will assess the final experience.

The website download prompt appears on the platform homepage once per browser session. Its X closes it for the session; checking “Don't Show this again” stores a persistent preference. It does not appear in the Android app or on storefront pages. The Android in-app update prompt checks for a newer manifest only on the platform homepage. Version 1.3.0 (code 4) includes the App and Browser plugins and the local offline fallback path. Google sign-in and offline recovery still need end-to-end verification on the Galaxy A31 using the deployed staging site. Google Play acceptance remains unverified.
