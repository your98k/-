# 组卷台：Google Play 与国内安卓商店发布准备

核对日期：2026-11-09。本文记录双渠道首发所需的技术产物与发布者待办，不代表商店审核、备案或其他手续已经完成。政策可能变化，提交时应重新核对对应平台及主管部门的最新要求。

当前交付为 **0.1.0 测试版**。正式上架尚缺发布者确认的主体身份、目标受众、适用备案手续和生产签名，以及适用的 AI 内容反馈机制；这些属于发布阻塞项，不能将构建成功或可安装视作已满足全部商店政策。

## 当前产物及签名状态

| CI artifact | 内容 | 用途和限制 |
| --- | --- | --- |
| `zujuantai-android-debug` | `app-debug.apk` | 开发签名的安装测试包；不能当作正式发布签名产物。 |
| `zujuantai-android-release-unsigned-apk` | `app-release-unsigned.apk` | 未签名 release APK；需由发布者使用生产签名后，再按国内商店要求提交。未签名 APK 不能直接安装。 |
| `zujuantai-android-release-unsigned` | `app-release.aab` | 未签名 release Android App Bundle；需完成上传签名和 Google Play 的应用签名配置后提交。 |

当前版本为 `0.1.0` / `versionCode 1`，包名 `io.github.your98k.questionbank`，最低 Android 8.0 / API 26，目标 API 36。下一次上传同一应用的新版本前，应递增 `versionCode`，并重新检查商店当时的目标 API 要求。[Google Play 应用设置说明](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)

仓库和 CI 不生成、不保存、不公开生产 keystore、密码或任何人的 API Key。正式签名由发布者在自己控制的环境中配置并保管；不要把生产 keystore 或密码上传到 GitHub 文件、issue 或聊天。

Google Play 区分“上传密钥”和“应用签名密钥”：前者用于验证上传者，后者用于最终分发给用户的应用。首发前由发布者决定 Play App Signing 的配置和国内渠道的签名安排，明确是否要求同包名跨渠道覆盖安装；不能把上传密钥和实际应用签名密钥视作同一概念。[Play App Signing 官方说明](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)

## 两个渠道共同需要发布者确认的资料

- 开发者主体及账号：个人或组织、真实身份信息、支持邮箱和各商店要求的验证材料，由账号持有人本人确认和提交。
- 应用展示资料：最终应用名、图标、真实截图、简短与完整描述、类别、版本说明；不得承诺尚未具备的能力或官方教材/考试来源。
- 生产隐私政策 URL：公开、持续可访问、与应用及开发者名称相符；应用内入口和商店填写值必须一致。发布前需要把草稿/占位联系信息替换为发布者确认的信息。[Google Play 用户数据政策](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- 数据处理说明：按最终实现核实本机题目、错题本、导出、剪贴板、个人 API 地址和模型的存储，以及联网请求的接收方。用户主动配置第三方 API 后，提示词及生成所需数据会发送给该服务；“用户自带 API”不能作为“不发生外部数据传输”的申报依据。
- 每个用户自行配置其 API 地址、模型和凭据；不得预置开发者或项目所有者的私人代理地址、访问口令或共享额度。API Key 仅在当前运行内存使用；系统备份和设备迁移排除规则应随正式包复核。
- 目标受众、内容分级、是否包含广告、付费功能和账号功能，均由发布者按最终产品实际行为确认。K12 内容不自动等于某一种受众声明；不能为了绕过儿童政策而填写与真实定位不符的年龄段。
- 准备可供审核者验证本地功能的说明。若 AI 功能需要自带凭据，应说明配置方式，按平台审核要求安排可控的审核访问条件；不得把生产用户密钥写进说明或包内。

## Google Play 首发

1. 发布者完成 Play Console 开发者账号与身份验证，确认适用的测试、设备验证及生产权限要求。具体要求以该账号的 Console 提示为准；本文不替账号确认已具备发布资格。
2. 创建应用，确认固定包名、发布名称、分发地区及签名方案。使用完成上传签名的 release AAB，配置 Play App Signing；不要上传本仓库的未签名 AAB 或 debug APK 作为正式产物。[应用创建说明](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)、[签名说明](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
3. 在 App content 完成隐私政策、Data safety、应用访问、广告声明、内容分级和目标受众等项目。Data safety 要结合第三方 API、库及最终包的实际行为逐项核对，由发布者签认，不能直接复制本文当作答案。[审核前准备](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)、[Data safety 填写说明](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
4. 如实际受众包含儿童，核对 Families 政策及所选第三方服务是否允许相应使用；仅面向教师/家长的定位也必须与界面、商店描述和实际功能一致。[目标受众说明](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en)、[Families 政策](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
5. 核对生成式 AI 政策适用范围和落实情况。Google 的相关政策要求适用的生成式 AI 应用具备应用内举报或标记渠道；0.1.0 测试版尚未建立面向公众运营的反馈接收和处理流程，需按适用要求补齐并验收后再提交，不能仅依靠“答案需人工核验”替代该要求。[AI-Generated Content 政策](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en)
6. 先完成商店要求的测试与预发布检查，再由发布者确认并提交正式审核。此工程没有执行 Play Console 提交或发布。

## 国内安卓商店首发与 APP 备案核对

工信部的《工业和信息化部关于开展移动互联网应用程序备案工作的通知》（工信部信管〔2023〕105号）将境内从事互联网信息服务的 APP 主办者列入备案要求，并对分发平台核验和备案信息展示提出要求。工信部后续办事指南仍将该通知列为办理依据。[工信部通知原文](https://www.miit.gov.cn/zwgk/zcwj/wjfb/tz/art/2023/art_920db564162e4312916a01bed6540ad8.html)、[工信部现行办事事项](https://ythzxfw.miit.gov.cn/bssx/alx/dxhhlw/art/2025/art_88c400fc83904008bcf5b11bc08ec18f.html)

本应用既有离线出题，也有用户自带接口的联网 AI 功能；本文不对其具体备案范围、是否存在例外、主体资格或审批结果作法律定论。不能仅因没有开发者自建后端、使用境外 API、或者由用户填写密钥，就推定免于备案。发布者应向住所所在地通信管理局、办理服务提供方及拟上架商店核实适用手续，依据最终服务形态办理。工信部官方解读可作为了解办理方式的入口。[工信部通知解读](https://www.miit.gov.cn/zwgk/zcjd/art/2023/art_39b4f1acc36745b98478e0ec3e07128d.html)

逐个拟发布商店核对并完成以下事项：

1. 开发者账号及主体审核；应用名、包名、生产签名证书、类别和版本材料的一致性。
2. 商店要求的 APP 备案信息及主办者材料；取得适用备案信息后，在应用和分发页面按要求展示。不得用虚构或其他应用的备案号填充界面。
3. 可访问的隐私政策 URL、应用内展示、权限及第三方 API/SDK 使用说明，以及商店要求的隐私检测、内容及资质材料；以各平台当时审核页面为准，不保证所有平台采用相同清单。
4. 使用完成生产签名的 release APK，核对签名证书及其指纹；当前 CI 的未签名 APK 只供发布者后续签名准备。
5. 结合教育用途、目标受众与 AI 能力核对是否还有其他适用要求；如不确定，应向相关主管部门或专业顾问核实，不能把本文件作为许可或合规证明。

## 提交前验收记录

由发布者逐项确认后记录日期及证据：

- [ ] 两个渠道的开发者账号、主体及分发资格已确认。
- [ ] 正式生产签名/Play App Signing 方案已确定，密钥由持有人安全保管。
- [ ] 隐私政策已使用正式 URL 和真实联系方式，应用内与商店内容一致。
- [ ] 每位用户自带 API，安装包和默认设置不含任何私人地址、Key 或共享代理。
- [ ] Data safety、权限、第三方服务、受众和分级声明与最终包的实际行为一致。
- [ ] 生成式 AI 的内容安全及举报/标记流程已完成适用性检查和验收。
- [ ] 国内 APP 备案及各商店要求已向相应渠道核实并按适用情况办理。
- [ ] 本地出题、AI 自带接口、导出、更新安装、数据清除及离线启动已在真实设备验收。
- [ ] 所有正式提交由发布者本人确认；当前文档与构建流程未提交任何商店。
