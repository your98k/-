# 组卷台 Android

首个 Android 原生版本使用 Kotlin、Jetpack Compose 和 Material 3。离线题目引擎由仓库中的数学与其他学科生成器打包为应用资源，在本机运行；界面不依赖 WebView 或 GitHub Pages。

- 应用名：组卷台
- 包名：`io.github.your98k.questionbank`
- 版本：`0.1.0`（`versionCode = 1`）
- 最低系统：Android 8.0 / API 26
- 编译及目标 SDK：Android 16 / API 36

## 本地构建

需要 Node.js 22+、JDK 17、Gradle 8.13、Android SDK Platform 36 和 Build Tools 36.0.0。将 `ANDROID_HOME` 指向完整 Android SDK，或在 `android/local.properties` 中配置 `sdk.dir`；不要把本机路径提交到仓库。

在仓库根目录执行：

```sh
node tools/build-android-assets.js
gradle -p android testDebugUnitTest lintDebug lintRelease assembleDebug bundleRelease
```

此流程不需要安装网页的 npm 依赖。项目未提交二进制 Gradle Wrapper，请使用 Gradle 8.13 或在 Android Studio 中为项目选择该版本。

安装包输出：`android/app/build/outputs/apk/debug/app-debug.apk`。连接开启 USB 调试的手机后，可使用：

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Debug APK 适合安装测试；它使用开发签名，不是应用商店发布包。

商店用的未签名 Android App Bundle 输出为 `android/app/build/outputs/bundle/release/app-release.aab`。工程没有配置生产签名，也不会生成或提交生产 keystore。开发者需要自行提供并保管上传签名密钥，按商店要求对发布产物签名；Google Play 发布需要配置 Play App Signing。此构建流程只生成产物，不自动上传或发布到商店。

## GitHub Actions 打包

仓库 Actions 中的 **Build Android APK** 支持手动运行，也会在 Android、离线题库引擎或打包流程变动时执行。工作流使用 JDK 17、Gradle 8.13 和 SDK 36，先运行单元测试、debug/release lint，再输出可安装 APK 和未签名 release AAB。

完成后下载 `zujuantai-android-debug` artifact，解压其中的 `app-debug.apk` 并在安卓手机上安装。

面向商店准备的 AAB 在 `zujuantai-android-release-unsigned` artifact 中。它仍需开发者完成生产上传签名、隐私政策及商店审核资料，不能把 debug APK 的开发签名当作长期发布签名。

工作流另有 Android 10 / API 29 模拟器冒烟测试，使用真实原生界面与离线引擎，验证启动、综合组卷、方程专项和 API 设置入口，不填写密钥或调用 AI 接口。模拟器检查失败时，构建任务已经上传的 APK 仍保留，便于检查问题。设备测试报告在 `android-device-test-reports` artifact 中。

本机连接设备或启动模拟器后，可以执行 `gradle -p android connectedDebugAndroidTest` 运行相同检查。

## 配置与数据

每位用户需要填写自己的 API 地址、模型和 API Key / 代理访问口令。应用没有默认的私人 API 地址、开发者代理或共享密钥，也不使用项目所有者的 API 额度；网页保存的浏览器设置不会自动进入 Android 应用。不要把任何人的服务商密钥或个人访问口令写进代码、构建配置或 CI 环境。

应用仅声明联网权限，不申请共享存储权限。PDF 等分享文件由应用临时写入 `cacheDir/exports/`，再通过受限的 FileProvider 临时授予读取权限。

应用关闭系统备份，并通过备份及设备迁移排除规则禁止导出本地应用数据。API Key 只在当前运行内存中使用，不写入磁盘；地址和模型等本地设置也不参与系统备份。

## 0.1.0 发布准备说明

- 最低系统为 Android 8.0 / API 26；目标系统为 Android 16 / API 36。
- 原生综合组卷、方程专项、错题收藏和试卷导出；本地出题无需配置 API。
- AI 功能为用户自带接口与密钥，只有用户主动生成或测试连接时才向其配置的服务地址发送请求。题目、答案和解析需要人工核验。
- 不内置项目所有者的 Worker 地址或访问口令，不设置统一付费模型入口。
- 发布前应核对真实数据处理行为并提供隐私政策、支持联系方式及商店 Data safety 等申报；第三方 AI 服务的处理政策由用户所选服务商提供。
- 当前 CI 输出是测试 APK 与未签名发布 AAB，尚未完成应用商店签名或提交审核。

API 及版本参考：[AGP 8.13 兼容性](https://developer.android.com/build/releases/agp-8-13-0-release-notes)、[Compose 编译器插件](https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler)。
