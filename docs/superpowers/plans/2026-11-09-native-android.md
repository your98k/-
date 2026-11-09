# Native Android Implementation Plan

> **For agentic workers:** Execute the independent engine, platform, data, and native UI tasks in parallel, then review the assembled application.

**Goal:** Produce an installable Android APK for 组卷台, with native screens and offline question generation.

**Architecture:** Kotlin and Jetpack Compose provide all application screens. The bundled question rules run in a sandboxed Java interpreter without any WebView or browser; native Android networking, persistence, document export and navigation handle platform functions.

**Tech Stack:** Kotlin 2.2.20, Compose, Android SDK 36 (minimum API 26), Rhino, Gson, GitHub Actions.

## Global Constraints

- No WebView, Capacitor, remote-page UI or embedded user credentials.
- API secrets remain in process memory. Only endpoint and model persist.
- Offline question generation, native PDF/DOCX export, clipboard and a local wrong-answer collection.
- App name 组卷台; application ID io.github.your98k.questionbank; initial version 0.1.0.
- Build an installable test APK and unsigned release AAB. Public distribution uses each person's own API; store submission needs the publisher's signing identity and developer account.

## Review Focus

- Local curriculum selections must not silently fall back to another grade.
- AI cancellation and failures retain the previous paper and do not retry or leak credentials.
- Native navigation and configuration changes do not discard the saved paper or wrong-answer collection.
- Exported pages handle Chinese, multiple pages and optional answers without browser rendering.
- CI must compile, run engine/network validation tests, lint and produce the APK.

### Task 1: Offline engine
- [ ] Generate Android-only engine assets from core/generators and the pure equation factories.
- [ ] Implement sandboxed QuestionEngine and unit tests for curriculum and several subjects/stages.

### Task 2: Native data and export
- [ ] Implement API batching, validation, cancellation and bounded HTTPS responses.
- [ ] Implement local paper/wrong-answer persistence without API keys.
- [ ] Implement paginated PDF and DOCX document export.

### Task 3: Compose UI
- [ ] Implement four native screens, curriculum selectors, preview, question collection and API setup.
- [ ] Integrate background generation, cancellation, errors, SAF export and clipboard.
- [ ] Add native UI smoke tests and verify no WebView dependency or source usage.

### Task 4: Build and deliver
- [ ] Create Android Gradle configuration, app resources and CI APK build.
- [ ] Run JVM tests, lint, compile and device smoke tests where available.
- [ ] Review final changes, upload build artifact and return the download link with build limitations.
