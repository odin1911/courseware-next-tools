# KJG_QAP_BD_v2_2026 prd-analysis

## 1. 场景结构与挂靠表

| 类型 | 标识 | 宿主 | 当前实现 |
|---|---|---|---|
| page-scene | lobby | 页面根 | `components/LobbyScene.tsx` |
| page-scene | main | 页面根 | `components/MainScene.tsx` |
| overlay-scene | pause / second-confirm / result / word-list | 页面根 | `components/overlays/*` |
| overlay-in-main | countdown / day-switch / choose-food | `MainScene` | `CountdownOverlay`、`MainSceneParts/DayCurtain.tsx`、`ChooseFoodOverlay.tsx` |
| substate | countdown / day-opening / malu-entering / answering / submitting / correct-feedback / wrong-feedback / timeout-feedback / day-closing / choose-food / finished | `MainScene` | 显式 `mainSubstate`，按 PRD 主链推进 |

### 场景完整性表

| PRD 场景 / feature / overlay | 是否实现 | 位置 | 备注 |
|---|---|---|---|
| lobby | 是 | `LobbyScene.tsx` | 标题骨骼入场 + idle float + Start 延迟出现 |
| main | 是 | `MainScene.tsx` | 单局主链与 checkpoint |
| pause / second-confirm | 是 | `overlays/PauseOverlay.tsx` | 复用 shared 壳层 |
| result | 是 | `overlays/ResultOverlay.tsx` | success / fail 同层，z-index 已抬到主场景之上 |
| word-list | 是 | `overlays/WordListOverlay.tsx` | 全量题库回看 |
| choose-food | 是 | `overlays/ChooseFoodOverlay.tsx` | 590×304 内嵌 overlay |
| day-switch | 是 | `MainSceneParts/DayCurtain.tsx` | 300ms 进场 + 1500ms 停留 + 300ms 退场 |
| countDownMovie | 是 | `shared/components/countdown-overlay` + `MainScene.tsx` | 公共 DragonBones 倒计时 |

## 2. 主链路与回流矩阵

| 起点 | 触发 | 终点 | 备注 |
|---|---|---|---|
| lobby | Start | main.countdown | 无 setting scene |
| countdown | 倒计时结束 | day-opening | 进入主局 |
| day-opening | 门帘完成 | malu-entering | 启动主流程 |
| malu-entering | 入场完成 | answering | 开放滚动字母 |
| answering | bell | submitting | 锁住所有输入 |
| submitting | 判题正确 | correct-feedback | 金币 +10 |
| submitting | 判题错误 | wrong-feedback | 扣心 |
| answering | timeout | timeout-feedback | 不走 bell |
| `*-feedback` | 题后收尾 | 下一题 / day-closing / finished | 看 heart、wordIndex、threshold |
| day-closing | 关门完成 | choose-food | 命中 checkpoint 才进入 |
| choose-food | 选任一食材 | day-opening | 回写下一天的主题食材帧 |
| pause | Continue | answering | 恢复原题 |
| pause | Reset | second-confirm | 暂停链内部回流 |
| second-confirm | OK | main.countdown | 重开整局 |
| result | Confirm | word-list | 主结果出口 |
| word-list | Home / Reset | lobby / main.countdown | 结束回流 |

## 3. 冻结范围与恢复矩阵

| 状态 / overlay | 冻结输入 | 音频处理 | 恢复点 |
|---|---|---|---|
| countdown | bell / pause / food rows | 仅 countdown 自身音频 | 结束自动恢复 |
| day-opening / day-closing | main 全禁触 | 日切 SFX 独占 | 门帘结束 |
| malu-entering | food rows / bell | walk SFX | 入场完成 |
| submitting / feedback | food rows / bell / pause | 当前反馈 cue 独占 | 收尾后下一状态 |
| choose-food | 主局禁触 | 保留当前局 BGM | 选择后恢复 |
| pause / second-confirm | main 全禁触 | BGM pause / resume | Continue / Cancel |
| result / word-list | 主玩法永久冻结 | 主 BGM stop | Home / Reset |

## 4. 数据适配与运行时管线

1. `App` 直接调用 `getExerciseInterceptor(props)`；不重组启动参数，也不使用本地预览 JSON 作为无参数 fallback。
2. `normalizeBDExercise`：消费 `GameExerciseDataProvider.requestWordBanks(true)`，把 `marc-word-banks / word-banks` 映射成 `{ word, audioUrl, imageUrl, skeletonUrl, animationType, module, letters }`。
3. `computeHearts / computeEachDayCoustoms / computeDayThresholds`：把词数映射到生命值、三天配额和 checkpoint。
4. `runtime.ts`：提供 charList、判题、Malu 站位、动作名别名、hint 模式、food frame 序列等纯函数。
5. `MainScene.tsx`：只消费上层规范化后的题目与 runtime helper，不直接解析接口字段。

## 5. 资源迁移清单

| 资源类别 | 落点 | 使用位置 |
|---|---|---|
| atlas | `assets/textures/KJG_QAP_BD_v2.{json,png}` | Lobby / Main / Bell / ChooseFood / FoodBelt / LetterSlots |
| 背景图 | `assets/textures/BD_*.png` | Lobby / Main / Result / WordList |
| DragonBones | `assets/skeleton/*.zip` | 标题、Malu、门帘、结果、heart、audio hint |
| 音频 | `assets/sounds/*.mp3` | BGM、bell、eat、ticking、金币、结果 |
| 公共 atlas | `src/shared/assets/common/commonGame.{json,png}`、`commonGame3.{json,png}` | Pause / Result / WordList / pause icon / heart strip |

### animationBinding 常量摘要

| 节点 | 资源 | armature | animation |
|---|---|---|---|
| Lobby title | `BD_title.zip` | `armatures/skeleton_movie_1` | `start -> end(float by CSS)` |
| Countdown | `count.zip` | `armatures/skeleton_movie_1` | 默认首段 |
| Day curtain open / close | `BD_open.zip` / `BD_close.zip` | `armatures/skeleton_movie_1` | `start -> end` |
| Malu | `BD_ola.zip`...`BD_pili.zip` | `armatures/skeleton_movie_1` | `enter / wait / angry / sad_eating / happy_eating / pay_2 / turn_round` 通过别名对齐 |
| Heart break | `heart.zip` | `armatures/skeleton_movie_1` | `start` |
| Audio hint | `AudioButtonView` | shared frame animation | `isPlaying` 由 `promptManagerRef` 播放状态驱动 |
| Result | `BD_mission_successed.zip` / `BD_mission_failed.zip` | `armatures/skeleton_movie_1` | 默认首段 |

## 6. 音频与时序常量表

| 常量 | 数值 / 资源 | 用途 |
|---|---|---|
| `DAY_WAIT_TIMES` | `90 / 60 / 45s` | Day1~3 等待时长 |
| Countdown step | `700ms` | 3-2-1 |
| Day curtain | `300 + 1500 + 300ms` | 开门 / 关门 |
| Malu entry | `|x+160| * 10ms` | 入场 |
| Correct wait | `2500ms` / `3000ms(pili)` | `happy_eating` |
| Wrong wait | `3000ms` | `sad -> angry` |
| Bell submit settle | `1000ms` | 提交后停顿 |
| Gold reward | `+10` | 正确题 |
| Audio cues | `BD_main_bgm / BD_bell / BD_happy_eating / BD_sad_eating / BD_clock_ticking / BD_day_start / BD_day_end / BD_game_over / BD_clearance / BD_heart_broken / BD_money_drop / BD_money_add` | 主链 cue |
| Lobby BGM | `game_lobby_bgm` | lobby 首页循环背景音乐，独立于 main BGM |

## 7. TypeScript 类型与文件拆分计划

- `sceneTypes.ts`：page-scene / overlay-scene / runtime 数据类型。
- `logic/normalizeExercise.ts`：数据适配。
- `logic/runtime.ts`：算法、动作别名、food frame helper。
- `components/LobbyScene.tsx`：大厅独立 page-scene。
- `components/MainScene.tsx`：主链编排，只组合 parts 与 overlay-in-main。
- `components/MainSceneParts/*`：FoodBelt、LetterSlots、Malu、Clock、Heart、Curtain、Bell。
- `components/overlays/*`：Pause、Result、WordList、ChooseFood。

## 8. 风险点与 TODO

| 风险点 | 当前处理 | 后续人工验证 |
|---|---|---|
| 旧包中 `pili` 可能默认不可达 | Web 端开放 5 角色随机 | 验证是否接受与旧 bug 差异 |
| Day2 / Day3 计时 | 已按 90 / 60 / 45 产品意图实现 | 若需 bug-compat 再加显式开关 |
| 图片 hint 题资源可能只返回静态图 | 页面已兼容 `skeletonPath` 与 image-only `imagePath` 两条链路 | 用真实线上题数据复核静态图与骨骼图都可见 |
| production mock 资源前缀 | 本地预览 / E2E 需显式提供 `VITE_RES_URL_PREFIX=https://course-assets.alo7.com/generate/pieces/` | 跑 dev / Playwright 时确认题目资源与骨骼可正常加载 |

### validation anchors 表

| 节点 / 状态 | 观测点 | `data-*` |
|---|---|---|
| lobby | 标题 canvas、Start 按钮 | `data-scene="lobby"`、`data-role="start"` |
| main | 子状态切换 | `data-scene="main"`、`data-main-substate` |
| countdown | DragonBones 倒计时 | `data-overlay="countdown"`、`data-render-mode="dragonbones"` |
| day switch | 开门 / 关门层 | `data-overlay="day-switch"`、`data-animation` |
| choose food | 左右候选 + Get | `data-overlay="choose-food"` |
| hint bubble | 提示泡泡 | `data-role="hint-bubble"` |
| wait circle | 等待圈 | `data-role="wait-circle"`、`data-render-mode` |
| malu | 角色宿主 | `data-role="malu"`、`data-malu-name`、`data-animation` |
| food rows | 列数与交互 | `data-role="food-row"`、`data-role="food-item"` |
| answer slots | 底部答案 | `data-role="answer-slot"` |
| pause chain | pause / second | `data-overlay="pause-pop"`、`data-overlay="second-pop"` |
| result / word-list | 结果与词单 | `data-overlay="result-pop"`、`data-overlay="word-list-pop"` |

### 关键视觉节点保真表

| 节点 | tamic 证据 | 必须复刻的资源链 | 是否允许 fallback | 当前实现状态 |
|---|---|---|---|---|
| Lobby 标题 / Start CTA | `scene-lobby/ui.md`、`scene-lobby/logic.md` | `BD_title.zip` + `KJG_QAP_BD_v2_start_btn` + 标题 float / Start enter+pulse | 否 | Exact |
| Countdown | `shared.md`、`scenes.md` | 公共 `count.zip` 倒计时骨骼 | 否 | Exact |
| DaySwitch | `overlays/day-switch/index.md` | `BD_open.zip / BD_close.zip` + 黑幕 + `start/end` 动作链 | 否 | Exact |
| Heart HUD | `files.md`、`shared.md` | `commonGame3_heart` + `heart.zip` | 否 | Exact |
| Pause CTA | `scene-main/ui.md` | `gameCommon_pause` | 否 | Exact |
| Hint bubble | `shared.md` | 图片提示走题目 skeleton；音频提示走 shared `AudioButtonView`，播放仍由 `MainScene.promptManagerRef` 控制 | 否 | Shared audio button |
| Food row / bell | `scene-main/ui.md`、`files.md` | `btn_getfood_bg`、左右箭头、food atlas、`KJG_QAP_BD_v2_bell` | 否 | Exact |
| Result / WordList | `files.md`、`shared.md` | `BD_mission_successed.zip / BD_mission_failed.zip` + shared overlay 壳层 | 否 | Exact |

### tamic 差异日志

| # | 差异描述 | tamic 行为 | 当前实现 | 处理动作 |
|---|---|---|---|---|
| 1 | Lobby 标题链 | 标题骨骼播首段后再进入 float，Start 延迟出现 | 已对齐为 `start -> float`，Start 走 enter+pulse | Align |
| 2 | countDownMovie | 公共骨骼倒计时 | 已改用 shared `CountdownOverlay` | Align |
| 3 | DaySwitch | `start -> end` 门帘链，不显示额外文案 | 已去掉 `DAY START / DAY END` 文本，按 300/1500/300 推进 | Align |
| 4 | Heart HUD | 公共心形资源 + `heartMovie` 破碎 | 已改为 `HeartLivesStrip + heart.zip` | Align |
| 5 | Pause / Hint 占位 | 原模板无 `II` 文本和 `Play Hint` 文案 | 已替换为 `gameCommon_pause` 与图片 / 音频提示宿主 | Align |
| 6 | FoodBelt | 非圆角卡片，而是 atlas 选中列 + 150×60 item 结构 | 已切到 atlas 高亮、箭头、food frame 与 15 槽滚动链 | Align |
| 7 | result / word-list overlay | 页面级 overlay 必须压在主场景之上 | 已补全全屏包装与 z-index | Align |
| 8 | FoodBelt 左右箭头方向 | 左箭头让字母带整体向左移动；右箭头让字母带整体向右移动 | 曾把 `centerIndex +/- 1` 映射写反，导致视觉方向与 tamic 相反 | Align |
| 9 | FoodBelt 循环补位 | `moveCharList()` tween 结束后会重排 `itemList`，保证边缘继续有字母接上 | 曾只改中心索引、不做循环窗口，滚到末尾后露空白 | Align |
| 10 | timeout 反馈文案 | 超时只走 angry + 心碎 + 扣心推进，没有额外 `TIME OUT` 词板 | 曾在 `handleTimeout()` 里额外渲染 `word_bg + TIME OUT` | Align |
| 11 | 错题 angry 播放次数 | `aiAnger()` 用单次播放，不应循环重复 | 曾把 `angry` 放进循环白名单，导致错题 angry 重复 | Align |
| 12 | 倒计时预警表情 | 作答倒计时预警阶段不提前切 angry，只有 timeout 后才 angry | 曾在 `remainingMs <= 3000` 时提前切 angry | Align |

## 原模板分析 — Bell 前景层在大屏浏览器下被吞没

- 原模板证据
  - `PRD/KJG_QAP_SD_v2/scene-main/ui.md` 明确写了 `Bell 固定在右下角，是唯一提交入口`；BD 沿用同一玩法骨架。
  - `PRD/KJG_QAP_SD_v2/scenes.md` 约束 `bell` 挂在 `main` 前景层，`必须晚于字母带但早于反馈板`；BD 同样继承这条 scene 合同。
  - `../tamic-egret/resource/assets/template/Burger_Diner_v2/eui_skin/ccomponents/BD_GMain.exml` 里 bell 是主场景显示列表上的独立按钮资源，不属于字母带内部节点。
- 当前 Web 实现证据
  - `MainScene.tsx` 修复前把 `BellButton` 直接和 `FoodBelts` 混在同一段主场景 DOM 里，虽然逻辑 `zIndex` 是 12，但在大屏/GPU 合成路径下，底层 belt/骨骼/canvas 宿主可能被浏览器提升成更高的合成层，导致 bell 节点存在却不可见。
- 本次修复结论
  - 给 `MainScene` 建立独立 stacking context。
  - 把 bell 提升到单独的 `bell-layer` 前景层，保持 `zIndex: 12`，继续满足“高于字母带、低于反馈板”的 PRD 顺序。
  - `BellButton` 显式声明 `pointerEvents: auto`，避免前景层使用 `pointer-events: none` 后影响真实点击。

## 原模板分析 — 主场景上下背景并非同一背景层

- 原模板证据
  - `../tamic-egret/resource/assets/template/Burger_Diner_v2/eui_skin/ccomponents/BD_GMain.exml` 的显示列表顺序不是“整页背景 -> 整页玩法”。实际顺序是：`bgBottom` -> HUD(`imgDay/imgMoney/dayText/goldText`) -> `malu` -> `bgTop` -> `letterView` / `foodList` / `payMoney` / `finalFoodView` / `lettersContainer` -> `btnPause` / `btnBell` / `heartContainer` / `chooseFood` -> `daySwitch` -> `countDownMovie`。
  - 这说明 `BD_main_bg_1_png` 在原模板里承担的是 scene 内部的前景遮挡层，不是普通背景底图；它需要压住一部分玩法节点，但又必须低于 `chooseFood`、`daySwitch`、`countDownMovie` 这类 overlay。
- 当前 Web 实现证据
  - `MainScene.tsx` 之前把 `bd-main-bg-bottom` 和 `bd-main-bg-top` 一起放进 `FixedStageSceneFrame(background=...)`。
  - `FixedStageSceneFrame` 之前缺少 scene 级 stacking context，`bgTop` 只能靠子节点 `z-index` 往上抬；这会让它越过 `contentFrame` 里的倒计时，甚至在缺少 scene 隔离时越过页面级 overlay。
- 本次修复结论
  - shared `FixedStageSceneFrame` 为整个 scene 建立独立 stacking context，避免 scene 内高 `z-index` 节点越过页面级 overlay。
  - Burger Diner main scene 改成：`bgBottom` 继续走 scene `background`；`bgTop` 不再抽成 shared 通用前景，而是按原模板顺序插回 `malu` 与 `food/letter/bell` 之间的 scene 内中间层。
  - 页面级 `result / word-list` overlay 继续由 App 层挂载，因此仍稳定高于整个 main scene，不再被 `bgTop` 穿透覆盖。

## 原模板分析 — 提交答案后底部挖空槽位仍保留

- 原模板代码路径 / 关键类或函数名：`PRD/KJG_QAP_BD_v2_2026/validation anchors 表` 已把底部答案区单独定义为 `data-role="answer-slot"`；当前 Web 实现中直接控制该区域的文件是 `src/pages/KJG_QAP_BD_v2_2026/components/MainSceneParts/LetterSlots.tsx` 与 `src/pages/KJG_QAP_BD_v2_2026/components/MainScene.tsx`。`LetterSlots.tsx` 已内建“空字母仍渲染槽位底图”的逻辑：`frameName={isFilled ? '...frame2' : '...frame'}`。
- 关键行为描述：提交答案进入 `answerFeedback` 后，反馈层 `AnswerFeedbackOverlay.tsx` 负责把已提交字母从底部槽位动画移动到中间反馈板；这要求底部槽位继续存在作为视觉锚点，但槽位内文字需要清空，避免和移动中的字母重叠。
- 与当前 Web 实现的差距或一致点：修复前 `MainScene.tsx` 在 `answerFeedback` 存在时直接卸载了 `LetterSlots`，导致底部挖空框整体消失。当前修复改为始终保留 `LetterSlots`，反馈态向其传入同长度的空字符串数组，只隐藏字母、不隐藏槽位底图；不改反馈动画、判题状态机或 bell 提交流程。

## 原模板分析 — Overlay 宿主与 16:9 遮罩边界

- Burger Diner 与 Sandwich Diner 共用 `_Pizza_Diner_v2` 控制器结构：Main 流程节点在 Main 内，Pause/Second/Result/WordList 位于 scene 根模态显示列表。
- 原模板固定 1024×768 时，Main、遮罩和 panel 坐标空间相同；当前 1280×720 舞台把 legacy 1024×768 内容框缩为 960×720，旧复合 `ChooseFoodOverlay` 的遮罩因此只能覆盖中间区域。
- 这不是 DragonBones 自动适配移除导致的裁切，而是遮罩错误继承了 panel 的 legacy 宿主尺寸；其它从一开始把遮罩放在 stage 根的游戏不会出现同一问题。
- Web 实现统一为 z=10 `MainFlowOverlayLayer` 和 z=30 `MainModalOverlayLayer`：宿主负责全舞台遮罩、层级和输入拦截，`DayCurtain/ChooseFoodOverlay` 只负责 panel 内容；Flow 仅由 `mainSubstate` 派生。

## beta 链接

```
https://webapp.beta.saybot.net/courseware-next/pages/KJG_QAP_BD_v2_2026/index.html?channel=ng-preview&businessContentUuid=aa51bdb82aa04c2015f55a4d6304b633&style=ENGLISH&accessToken=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1dHlwIjoiTERBUF9VU0VSIiwiYXVkIjpbImFvc3AtZ2F0ZXdheSIsIml5eS1hcGkiLCJhb3QiLCJ2d29wcyIsIm5vdGlmaWNhdGlvbi1jZW50ZXItYWRtaW4iLCJhb2MtYWRtaW4iLCJhaWdjIl0sInN1YiI6Im1pbi5saSIsImlzcyI6ImFsbzcuY29tIiwiZXhwIjoxNzgwNTgyNTgzLCJqdGkiOiIxZTg3MjMwMC05MDA1LTQwOGQtOTczYi00OTc1NjkxNzEyYjEifQ.vbLVFZumFocehKgRnlJsFg4bXBrU0Ikdol0c5WY2Td4L1EjYcdljJ6PoPSBh9ipXEQXat09clFy4Gtl52DT1g1jZcR12lu2fGnuHmfd7cD9k3bbOjXV6WP9s_q7zFQ4cb1oEegqq0qgYMnuH9bW8W6sYlmYAjCwY_-E67S2Sp1c
```
