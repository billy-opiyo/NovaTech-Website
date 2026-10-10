# Android app (Capacitor)

Nurava HubStores uses the existing Next.js deployment inside a Capacitor Android WebView. The web app remains the only UI and business-logic source. Its server-rendered App Router pages, route handlers, Auth.js sessions, and Prisma access continue to run on the deployed Next.js server; Android calls that same HTTPS origin and database through the existing server routes.

When the remote app cannot load, the Android `MainActivity` WebView client catches main-frame DNS, connection, timeout, I/O, TLS handshake, and server 5xx errors and opens the bundled `capacitor-shell/offline.html` fallback instead of Android WebView's plain “Webpage not available” screen. The failing URL, including its route and query string, is passed to the fallback. It retries that exact URL immediately and every two seconds, retries when Android reports connectivity restored or the app returns to the foreground, and navigates back once reachable. The React `OfflineNotice` still handles connection loss after the website has loaded.

The Android app uses the same deployed site and signed-in account as the browser, so platform font-size defaults and each user's saved font-size preference apply in the WebView automatically; website deployments do not require rebuilding the APK. Deploy database migration `0036_user_font_size_preference` before deploying the account-settings API change.

## In-app Android updates

The Android shell checks `/downloads/nurava-hubstores-update.json` when it opens and whenever it returns to the foreground. If its installed Android `versionCode` is lower than the manifest, a theme-aware update dialog offers **Download update**. The native updater accepts only HTTPS APK downloads from the currently configured app host and the staging APK path. Android Download Manager shows download progress and a completion notification; the user taps that notification and confirms installation in Android. An already-installed build without the native updater plugin falls back to opening the same APK in Android's browser for its first update. Android does not permit this app to silently replace itself.

For each native Android release, increment `versionCode` and `versionName` in `android/app/build.gradle`, update the matching `versionCode`/`versionName` in `frontend/public/downloads/nurava-hubstores-update.json`, build the APK, and copy it over `frontend/public/downloads/nurava-hubstores-staging.apk`. Deploy those website files together with the frontend update-check code. Users can then download and install the update from inside their existing app. Website-only changes still do not need a new APK. Installing an APK built with a different signing key will be rejected by Android as an update; keep using the same signing identity for all APKs on a device.

This project is not statically exported: page rendering and API routes use server-only Next.js and Prisma features. The Android shell therefore needs an internet connection and currently defaults to the live Vercel staging app at `https://nuravatech-saas-staging.vercel.app`. `CAPACITOR_SERVER_URL` can select a different HTTPS deployment when generating/syncing the Android project. Capacitor documents `server.url` primarily for live reload, so review Google Play's current WebView app requirements before preparing a production app.

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
npx cap add android
npx cap sync android
npx cap open android
```

The default Android build points to `https://nuravatech-saas-staging.vercel.app`. Set `CAPACITOR_SERVER_URL` to another HTTPS deployment before `cap sync` when you intentionally need a different target. Do not use HTTP or commit environment secrets.

### When a new APK is needed

The installed Android app loads the website from the configured HTTPS deployment. Website-only changes (pages, components, styles, and server/API behavior) become available in the app after they are deployed to that site and the app reloads; they do not require rebuilding or reinstalling the APK. For this staging setup, deploy the website changes to `saas-staging` so they reach `https://nuravatech-saas-staging.vercel.app`.

Rebuild and reinstall the APK when changing the native Android shell, such as its icon, native launch screen, permissions, Capacitor plugins, or the app's configured URL. The APK already installed on a device does not update when the website's remote code changes.

Build a debug APK:

```powershell
Set-Location "C:\Users\Billy\MY WEB PROJECTS\NovaTech Website"

# This machine's system Java is newer than the Gradle wrapper supports.
$env:JAVA_HOME = "C:\Users\Billy\AppData\Local\Temp\nurava-android-jdk21\jdk-21.0.12.1+1"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

npm run android:debug
```

`npm run android:debug` syncs Capacitor and builds the APK. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The commands above use the JDK 21 path currently available on this machine; if that directory is no longer present, set `JAVA_HOME` to another JDK 21 installation first. Alternatively, run `npm run android:sync`, then open the project in Android Studio and use **Build > Build APK(s)**.

To replace the staging APK served by the website after a native change, copy the new build to the public download path and deploy that file with the website:

```powershell
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk `
  frontend\public\downloads\nurava-hubstores-staging.apk -Force
```

Users who already installed the app must install the rebuilt APK to receive native changes. This debug APK is for staging and sideload testing; use a signed release APK/AAB for distribution.

Build a release APK or Play Store AAB:

```powershell
Set-Location android
./gradlew.bat copyReleaseApk
./gradlew.bat bundleRelease
```

For signing, set `NURAVA_ANDROID_KEYSTORE`, `NURAVA_ANDROID_STORE_PASSWORD`, `NURAVA_ANDROID_KEY_ALIAS`, and `NURAVA_ANDROID_KEY_PASSWORD` in your local build environment. The Gradle release build applies that signing configuration only when all four values are present. Keep the keystore outside the repository and never commit signing values. The AAB is written to `android/app/build/outputs/bundle/release/app-release.aab`; when signing is configured, the signed release APK is copied to `android/app/build/outputs/apk/release/nurava-hubstores.apk` for direct download. Without signing credentials, `copyReleaseApk` stops instead of labeling an unsigned APK as installable. The debug-signed staging APK remains the sideload/update artifact for existing staging installs.

## Android-specific behavior and remaining release work

`AndroidBackButtonHandler` listens only when running as Android and sends system back through browser history, exiting at the first page. No camera, location, notification, or storage plugins/permissions are added because current flows use ordinary WebView file inputs and the existing server APIs.

The Android launcher icon density and adaptive-icon assets under `android/app/src/main/res/mipmap-*` are generated from `frontend/public/images/Nurava_HubStores_app_icon_logo.png`. The native launch window uses a matching dark background with a transparent center icon; when the WebView draws the platform homepage, the existing `SplashScreen` component takes over and uses the configured glass mode, progress bar, and percentage counter. Android's native launch window cannot render the React progress animation before the WebView is ready.

Google sign-in in Android opens the staging website's Auth.js flow in a Chrome Custom Tab, so the OAuth state cookies are created and returned in the same browser context. After Google sign-in, `/api/auth/mobile-google/complete` issues a random, two-minute, single-use handoff ticket; Android receives it through `com.nurava.hubstores://auth/callback` and exchanges it through the existing Auth.js credentials flow to establish the normal app WebView session. The ticket is stored hashed in the existing `VerificationToken` table and consumed once; no separate account system or schema migration is used. Website sign-in continues using the ordinary Auth.js Google flow.

The Play Store review is not guaranteed for a WebView-led app: Google's current policy requires adequate app functionality and disallows a WebView of a site without the owner's permission. This app is for the existing Nurava commerce and merchant platform and the owner controls the site, but Play review will assess the final experience.

The website download prompt appears on the platform homepage once per browser session. Its X closes it for the session; checking “Don't Show this again” stores a persistent preference. It does not appear in the Android app or on storefront pages. The platform/storefront footer links serve `/downloads/nurava-hubstores-staging.apk` from `frontend/public/downloads/nurava-hubstores-staging.apk`, a debug-signed staging build that loads the Vercel staging app. No emulator or Android device is currently available. The new Google sign-in handoff compiles but still needs end-to-end verification on an Android device with the deployed staging site and Google OAuth configuration. Google Play acceptance remains unverified.
