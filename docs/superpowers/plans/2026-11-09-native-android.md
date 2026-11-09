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

## Continuation: Android build blockers

- Reproduced the latest CI failure (`42600593859`): Rhino 1.8.1 rejects
  repeated block-local `const` declarations. Android asset generation now uses
  Acorn to lower declaration nodes to block-scoped `let`, preserving property
  names, comments, literals and template contents. The web sources stay intact.
- Corrected the JVM fixture for chemistry grade 9 term 1 and Chinese grade 5
  term 1: their selected generators support fill-in questions and deliberately
  lack choice distractors. Kept question count and curriculum checks.
- Moved the API 27 light navigation bar attribute into `values-v27`; API 26
  inherits the common theme and uses a dark navigation bar with light icons.
- CI installs the locked asset dependencies, runs the asset regression tests,
  and also watches previously missing equation and utility source inputs.
- Verified 245 Node tests and 13 Android JVM tests, with zero failures. Debug
  and release lint report zero errors and 17 advisory warnings each.
- The debug APK builds and its v2 signature verifies; package ID, version and
  minimum SDK match the plan. No Android device is connected to this workspace;
  on-device smoke testing remains pending.
- Full Gradle verification succeeded with JDK 17, Gradle 8.13 and SDK 36:
  `testDebugUnitTest lintDebug lintRelease assembleDebug assembleRelease bundleRelease assembleDebugAndroidTest`.
  Debug APK, unsigned release APK/AAB and the instrumentation test APK all build.
  Compiling the instrumentation APK does not establish that device tests pass.
