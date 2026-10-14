# Android app (Capacitor)

The Android app is a native Capacitor container for the existing Next.js application. The website remains the single UI and business-logic source; both clients use the same deployed production application, APIs, Auth.js accounts, and PostgreSQL database. This is not a PWA or a second frontend. Server-rendered pages and route handlers stay on the Next.js server, so the Android shell requires an internet connection.

## Production target

`capacitor.config.ts` points to `https://nuravahubstores.com`. Production build commands must use this target. Staging domains, staging APKs, and staging update feeds are maintained on `saas-staging` and must not be copied or deployed from `main`.

## Build prerequisites

Use Node.js, Android Studio with the Android SDK, and JDK 21. Install repository dependencies first:

```powershell
npm install
```

Sync and open the production Android project:

```powershell
npm run android:sync:production
npm run android:open:production
```

Build a production release APK or Play Store AAB only after production release signing has been configured outside the repository:

```powershell
npm run android:release:apk
npm run android:release:aab
```

The release build must fail closed when the production signing key, approved certificate fingerprint, or release approval flag is missing. Keep keystore credentials outside the repository. Do not publish an unsigned APK/AAB as a production update.

## Website changes and Android rebuilds

Website-only changes become available to the app after they are deployed to the production website and the app reloads. Rebuild and reinstall the Android package when native Android files, permissions, plugins, launcher artwork, native launch screen, or the configured production URL changes.

## Native behavior

The Capacitor shell uses the production website and its existing server APIs. Native plugins are limited to capabilities used by the app. Google sign-in returns through the Android deep link and the existing Auth.js session. Offline handling uses the local shell page while the network is unavailable. Android updates must be published through the production update manifest and verified production-signed APK; a source change alone does not notify installed apps until a newer compatible production manifest and APK are deployed.

The website remains fully functional in browsers and the Android client shares its components, styling, authentication system, and backend. Physical-device and Play Store verification are separate release gates.
