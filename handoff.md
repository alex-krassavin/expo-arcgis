# expo-arcgis — Handoff

Рабочий документ переноса декларативного React-подхода ArcGIS (эталон — `web/src/components/ArcGisMap`, на `@arcgis/core`, web) в нативный Expo-модуль (ArcGIS Maps SDK Kotlin/Swift). Процесс ведём здесь.

## 1. Эталонный паттерн (web/ArcGisMap) — что переносим

Принципы, которые сохраняем 1:1:

1. **Один компонент = один класс SDK.** `MapSettings`, `Map`, `MapView`, `FeatureLayer`, `TileLayer`, `Graphic` — тонкие обёртки над классами ArcGIS.
2. **Props = параметры конструктора.** `type Props = NonNullable<ConstructorParameters<typeof ArcXxx>[0]>`. Никаких рукописных интерфейсов — поверхность повторяет SDK («по исходникам»).
3. **Композиция через React Context, headless.** Родитель создаёт объект SDK и отдаёт его в context (`useMap`, `useMapView`); ребёнок берёт из context и сам прикрепляется (`map.layers.add(...)`, `mapView.graphics.add(...)`). Всё, кроме view-хоста, рендерит `null`.
4. **Реконсиляция диффом.** `useRef(new ArcXxx(props))` — создать один раз; `usePrevious` + `getPropsDiffs` (lodash `isEqual`) → `instance.set(key, value)` по изменённым ключам; `destroy()`/remove на размонтировании. `forwardRef` отдаёт нативный инстанс наружу.
5. **Глобальные настройки через context.** `MapSettings` пишет в `esriConfig` (apiKey, тема/CSS) и гейтит детей до готовности.

Форма композиции:
```tsx
<MapSettings config={{ apiKey }}>
  <Map basemap="topo-vector">
    <MapView style={…} center={…} zoom={…}>
      <FeatureLayer url={…} />
      <Graphic geometry={…} symbol={…} />
    </MapView>
    <TileLayer url={…} />
  </Map>
</MapSettings>
```
Context-иерархия: `Map` (модель) снаружи → `MapView` (вид, берёт `useMap`) внутри; слои цепляются к `Map`, графика — к `MapView`.

## 2. Разрыв web → native

На web объекты SDK живут в JS (`new ArcMap(...)`), React держит их напрямую. В Expo объекты SDK живут в **Kotlin/Swift** — JS их не инстанцирует. → Сохраняем ту же React-оболочку (headless + Context + дифф), но каждый компонент управляет **нативным двойником** через мост:

- Натив держит реестр инстансов (map, view, layers, graphics) по ID.
- JS-компонент: создать-один-раз → попросить натив создать объект (хэндл), дифф → нативный `set(key, value)`, размонтирование → нативный destroy/remove.
- Примитив-кандидат: Expo **SharedObject** (нативный объект с идентичностью, доступный из JS) под Map/Layer/Graphic + нативная **View** под MapView/SceneView. Context передаёт хэндлы вниз (как `useMap`/`useMapView`).

> SharedObject я удалил в v1 — его, наоборот, надо вернуть как основу для хэндлов.

Грубая карта соответствий:

| web (web) | ArcGIS native | Expo-примитив |
|---|---|---|
| `MapSettings` (esriConfig: apiKey/тема) | `ArcGISEnvironment.apiKey` | module-функции + JS Context |
| `Map` (`ArcMap`) | `ArcGISMap` / `Map` | SharedObject + JS Context |
| `MapView` (`ArcMapView` + DOM) | view-based `MapView` / SwiftUI `MapView` | нативная Expo View (единственный реальный view) + Context |
| `FeatureLayer`/`TileLayer` | `FeatureLayer` / `ArcGISTiledLayer` | SharedObject, attach к Map |
| `Graphic` | `Graphic` + `GraphicsOverlay` | SharedObject, attach к MapView |
| `Scene`/`SceneView` (нет в web) | `ArcGISScene` / `SceneView` | симметрично Map/MapView |

## 3. Решения (приняты 2026-06-04 — см. журнал)

- **D1. Фиделити props.** У натива нет TS-типов конструкторов. Варианты: (а) мейнтейнить TS-типы props по форме `@arcgis/core` (знакомо по web) и транслировать в натив; (б) генерировать; (в) узкий subset на старте. → ?
- **D2. Хэндлы объектов.** Expo `SharedObject` на каждый объект vs непрозрачный ID + методы модуля. → ?
- **D3. Платформенные props.** Соглашение пометок (`@platform android` / `@platform ios`) и как мост игнорирует чужую платформу. → ?
- **D4. Реконсиляция.** Диффим в JS (как на web) и шлём только изменённые ключи, или шлём все props и диффим в нативе. → ?
- **D5. `set(key, value)`.** Дженерик-сеттер по ключу (рефлексия в Kotlin/Swift) vs типизированные сеттеры на каждый property. → ?
- **D6. Объём старта.** 2D (Map/MapView) сначала, Scene/SceneView потом — ок? → ?

## 4. План (итеративно, не торопимся)

- **Phase 0 (сейчас):** этот handoff; согласовать принципы и D1–D6.
- **Phase 1:** нативная обвязка хэндлов (SharedObject/реестр) + headless `Map` + `MapView` с Context.
- **Phase 2:** `Basemap` / `FeatureLayer` / `TileLayer` как headless-дети, attach к Map.
- **Phase 3:** `Graphic` + graphics overlay; события.
- **Phase 4:** `Scene` / `SceneView` — симметрия 2D/3D.

## 5. Статус

**Phase 1 реализована (код), ждёт сборки на устройстве:**
- JS: `MapSettings` / `Map` / `MapView` + context + `usePrevious` / `useUpdateEffect` / `getPropsDiffs`; контракт модуля `MapRef` (SharedObject) + `applyProps`. `tsc` ✅.
- Натив: `MapRef : SharedObject` (Kotlin + Swift), `ExpoArcgisMapView` (принимает `map`-проп), модуль с `Class`/`Constructor`/`applyProps`. Плоский `ExpoArcgisView` удалён.
- На устройстве не собиралось (нужен Xcode 26 + ключ). **Verify-points первой сборки:**
  - Android: мутатор `map.setBasemap(Basemap(style))`; `Constructor`/`Prop` с типами `Map<String, Any?>?` и `MapRef`; `EventDispatcher<Record>`.
  - iOS: `Map()` + `map.basemap = Basemap(style:)`; кейсы `Basemap.Style`; `APIKey(key)`; SharedObject как `Prop`; SwiftUI-хостинг через `UIHostingController`.

**Phase 2 реализована (код):**
- JS: `FeatureLayer` / `TileLayer` — headless (`useMap()` → `addLayer`/`removeLayer`, дифф → `applyProps`). `tsc` ✅. Example переведён на `react-native-safe-area-context`, `onMapLoadError` типизирован явно.
- Натив: `LayerRef` (база) + `FeatureLayerRef` / `TiledLayerRef`; `MapRef.addLayer/removeLayer` (Kotlin + Swift). **Verify-points:** `FeatureLayer(ServiceFeatureTable(url))` / `ArcGISTiledLayer(url)`; `layer.opacity` / `layer.isVisible`; `operationalLayers`; передача подкласса `LayerRef` аргументом в `addLayer` (полиморфизм SharedObject-аргументов в Expo); на iOS `URL(string:)!`.

**Phase 3 реализована (код):**
- JS: `Graphic` (headless, `useMapView()` → `addGraphic`/`removeGraphic`); `MapView` владеет default graphics overlay (проп + `MapViewContext`); событие `onTap`. `tsc` ✅.
- Натив: `GraphicsOverlayRef` + `GraphicRef` (Point + SimpleMarkerSymbol), `MapView.setGraphicsOverlay` + tap → проекция в WGS84. **Verify-points:** `SimpleMarkerSymbol`/`SimpleMarkerSymbolStyle`/`Color.fromRgba` (Android), `SimpleMarkerSymbol.Style`/`UIColor(hex:)` (iOS); `Point(lon,lat,wgs84)` / `Point(latitude:longitude:)`; `GeometryEngine.projectOrNull` / `GeometryEngine.project(into:)`; `onSingleTapConfirmed`-flow / `.onSingleTapGesture`; `MapView(map:graphicsOverlays:)`; вложенные Record/dict в событии.

## 6. Журнал процесса

> Здесь фиксируем решения и шаги.

- **2026-06-04** — создан handoff; изучён `web/ArcGisMap`; принципы зафиксированы.
- **2026-06-04** — расклад D1–D6 принят: D1 — зеркалим форму `@arcgis/core` (subset на старте); D2 — Expo SharedObject на каждый объект; D3 — `@platform android/ios` + no-op чужой платформы; D4 — дифф в JS (`usePrevious` + `getPropsDiffs`), в натив только изменённые ключи; D5 — дженерик-сеттер на SharedObject; D6 — 2D (`Map`/`MapView`) сначала. **Phase 0 закрыта → Phase 1.**
- **2026-06-04** — по докам Expo подтверждено: SharedObject конструируется из JS, передаётся в функции и **во view как проп** (прецедент `expo-image`/`SharedRef`). Скелет Phase 1 — см. раздел 7.
- **2026-06-04** — точная сигнатура SharedObject SDK 56 снята с генератора (`class X(appContext) : SharedObject(appContext)` / `class X: SharedObject`); JS-имя класса = простое имя нативного → `MapRef`.
- **2026-06-04** — Phase 1 реализована: JS (`tsc` ✅) + натив обеих платформ (`MapRef` + `ExpoArcgisMapView` + module). Verify-points — §5.
- **2026-06-04** — Phase 2 реализована: JS `FeatureLayer`/`TileLayer` (`tsc` ✅) + натив (`LayerRef`/`FeatureLayerRef`/`TiledLayerRef` + `addLayer`/`removeLayer`). Example: `SafeAreaView` → `react-native-safe-area-context`, `onMapLoadError` типизирован. Verify-points — §5.
- **2026-06-04** — Phase 3 реализована: JS `Graphic` + `useMapView`/overlay + `onTap` (`tsc` ✅) + натив (`GraphicsOverlayRef`/`GraphicRef` + tap + projection, обе платформы). Example: демо tap→pin. **Рекомендация: сборка на устройстве** — декларативная поверхность полная (map/layers/graphics/tap), но натив Phase 1–3 НЕ верифицирован (накопились ArcGIS API-точки). Phase 4 (Scene/SceneView) — опционально после сборки.

## 7. Phase 1 — скелет (на подтверждение)

**Нативные примитивы:**
- `MapRef : SharedObject` — оборачивает нативный `ArcGISMap` / `Map`.
  - `Constructor(props)` — создаёт карту из стартовых props.
  - `Function("applyProps")(changed: Map<String, Any?>)` — дженерик, `when(key)` применяет к нативной карте. Ключи Phase 1: `basemap` (стиль), `initialViewpoint`.
  - держит нативный `ArcGISMap`, доступный вью.
- `ExpoArcgisMapView` (Expo View) — `Prop("map") { view, ref: MapRef? -> view.setMap(ref) }`; берёт `ref.map`, отдаёт нативному `MapView`; события `onMapLoaded` / `onMapLoadError`.
- Module: `Class<MapRef>("ArcGISMap") { Constructor; Function("applyProps") }`, `Function("setApiKey")`, `View(ExpoArcgisMapView) { Prop("map"); Events(...) }`.

**JS (зеркало web):**
- `MapSettings` — `setApiKey` + React Context настроек.
- `Map` — `useRef(new ExpoArcgis.ArcGISMap(props))`; дифф (`usePrevious` + `getPropsDiffs`) → `ref.current.applyProps(changed)`; `MapContext.Provider`.
- `MapView` — `useMap()` → `<ExpoArcgisMapView map={map} … />`; `MapViewContext.Provider`.
- порт утилит `usePrevious`, `getPropsDiffs`.

**Композиция:**
```tsx
<MapSettings config={{ apiKey }}>
  <Map basemap="arcGISTopographic" initialViewpoint={{ latitude, longitude, scale }}>
    <MapView style={{ flex: 1 }} onMapLoaded={…} />
  </Map>
</MapSettings>
```

**Уточнение D5:** значение в `applyProps` гетерогенно → шлём изменённый subset словарём `Map<String, Any?>` (Expo поддерживает dictionary-аргументы), натив раскладывает по `when(key)`. На старте — keys `basemap`, `initialViewpoint`.

## 8. Phase 4 — Scene/SceneView (3D)

**Реализована (код, минимальный объём):**
- JS (`tsc` ✅): `Scene` (basemap, initialViewpoint) + `SceneView` (onSceneLoaded/onSceneLoadError/onTap); `SceneRef` SharedObject; `useScene()`.
- Натив (Kotlin + Swift): `SceneRef` (ArcGISScene/Scene), `ExpoArcgisSceneView` (view-based `SceneView` / SwiftUI `SceneView`), второй **именованный** view `Name("ExpoArcgisSceneView")`.
- Слои/графика под Scene НЕ сделаны → **Phase 4b**: обобщить контексты (`useLayerHost` для Map+Scene, `useGraphicsOverlay` для MapView+SceneView), чтобы `<FeatureLayer>`/`<Graphic>` работали и в 3D.

**Verify-points Phase 4:**
- Множественные views: `Name(...)` внутри `View{}` + `requireNativeView('ExpoArcgis','ExpoArcgisSceneView')`; уживаются ли дефолтный (map) и именованный (scene)? Если нет — назвать оба.
- `ArcGISScene()`/`Scene()` пустой + `setBasemap`/`scene.basemap`; `scene.operationalLayers`; `sceneView.scene`/`SceneView(scene:)`; `.onSingleTapGesture` у SceneView; lifecycle-observer у view-based SceneView.

**Журнал:**
- **2026-06-04** — Phase 4 (минимальная) реализована: Scene/SceneView, обе платформы (`tsc` ✅, натив не верифицирован). Phase 4b (слои/графика под Scene) — позже. Настоятельно: сборка на устройстве (4 фазы непроверенного натива).

## 9. Phase 4b — слои/графика под Scene (обобщённые контексты)

**Реализована (код, `tsc` ✅):**
- JS: `contexts.ts` — `useLayerHost()` (Map+Scene), `useGraphicsOverlay()` (MapView+SceneView); тип `GeoModelRef = MapRef | SceneRef`. `<FeatureLayer>`/`<TileLayer>` → `useLayerHost`; `<Graphic>` → `useGraphicsOverlay`. `Map`/`Scene` дают `LayerHostContext`; `MapView`/`SceneView` дают `GraphicsOverlayContext`. `useMapView` убран.
- Натив: `ExpoArcgisSceneView.setGraphicsOverlay` + `sceneView.graphicsOverlays` / `SceneView(scene:graphicsOverlays:)`; проп `graphicsOverlay` у scene-view (обе платформы).

Слои и графика теперь работают одинаково в 2D и 3D — единый декларативный API.

**Журнал:**
- **2026-06-04** — Phase 4b: контексты обобщены, `<FeatureLayer>`/`<TileLayer>`/`<Graphic>` работают под Map+Scene и MapView+SceneView (`tsc` ✅). Полный декларативный API для 2D и 3D. Натив Phase 1–4b — НЕ верифицирован; сборка на устройстве обязательна.

## 10. Рефактор контекстов (фидбек: «контекст по вложенной приоритетности»)

Убраны `LayerHostContext` и auto-`GraphicsOverlayContext`. Вместо них — **один контекст на контейнер**, который дают все подходящие родители; React берёт ближайший провайдер:
- `GeoModelContext` — дают `<Map>` и `<Scene>`; слои через `useGeoModel`.
- `GeoViewContext` — дают `<MapView>` и `<SceneView>`; `<GraphicsOverlay>` регистрируется через `useGeoView`.
- `GraphicsOverlayContext` — даёт `<GraphicsOverlay>`; `<Graphic>` через `useGraphicsOverlay`.

`<GraphicsOverlay>` — отдельный декларативный компонент (пользователь объявляет сам, их может быть несколько). View собирает overlay-детей в массив (`useState`) и шлёт нативу пропом `graphicsOverlays: GraphicsOverlayRef[]` (раньше был один `graphicsOverlay`).

```tsx
<Map basemap="arcGISTopographic">
  <MapView onTap={…}>
    <GraphicsOverlay>
      <Graphic point={…} symbol={…} />
    </GraphicsOverlay>
  </MapView>
  <FeatureLayer url="…" />
</Map>
```

**Verify-points:** Expo-проп `graphicsOverlays: List<GraphicsOverlayRef>` / `[GraphicsOverlayRef]` (массив SharedObject'ов как view-проп); `view.graphicsOverlays.clear()/addAll`.

**Журнал:**
- **2026-06-04** — рефактор контекстов: контейнерные контексты + декларативный `<GraphicsOverlay>` + массив overlay'ев у view (`tsc` ✅). Натив не верифицирован.

## 11. Верификация Android — BUILD SUCCESSFUL ✅

Прогон: `cd example && npm install` → `expo prebuild -p android` → Gradle `:app:compileDebugKotlin` (JDK 17 Zulu, Android SDK 36, ANDROID_HOME/JAVA_HOME заданы; дефолтный java 25 слишком новый).

**Найдено и исправлено:**
1. **RN-версия:** генератор create-expo-module дал `0.82.1`, Expo SDK 56 требует `0.85.3` → `expo install --fix` (react 19.2.3, babel-preset-expo ~56, typescript ~6). Симптом: `expo-modules-core` Kotlin не компилится.
2. **Kotlin-конфликт:** ArcGIS 300.0 = Kotlin 2.3.0, Expo 56 = 2.1.0; stdlib/reflect 2.3.0 заражают весь граф → config-plugin (`withArcGISKotlinMetadataFix`) ставит app-wide `-Xskip-metadata-version-check`. (Без флага — только ArcGIS 200.x.)
3. **FeatureLayer (наш код):** Kotlin-конструктор `FeatureLayer(table)` protected → `FeatureLayer.createWithFeatureTable(table)`. Swift `FeatureLayer(featureTable:)` публичный — править не надо.
4. `plugin/build` чистится `prepare` при install, а `tsc --build` не пересобирает из-за stale `plugin/tsconfig.tsbuildinfo` → чистить `.tsbuildinfo` перед `build:plugin`.

**Итог:** весь нативный Kotlin корректен; `BUILD SUCCESSFUL` end-to-end через config-plugin (Esri repo + minSdk 28/compileSdk 36 + Kotlin-fix — автоматически).

**iOS — осталось (нужен Xcode 26 + ключ):** `cd example && npx expo prebuild -p ios && npx expo run:ios`. Verify-points: `spm_dependency` линковка ArcGIS, `Map()`/`Scene()` init, `Basemap.Style` кейсы, `APIKey()`, SharedObject как Prop, SwiftUI-хостинг. Kotlin-проблемы на iOS нет (Swift = SPM binary framework).

**Журнал:**
- **2026-06-04** — Android-верификация пройдена (BUILD SUCCESSFUL). Фиксы: FeatureLayer.createWithFeatureTable, config-plugin Kotlin-metadata-fix, RN 0.85.3. iOS — ждёт Xcode 26.

## 12. Верификация iOS — схема ExpoArcgis BUILD SUCCEEDED ✅

Прогон здесь (нашлись **Xcode 26.5 + CocoaPods 1.16.2** — как раз требование ArcGIS 300.0): `expo prebuild -p ios` → `pod install` → `xcodebuild -scheme ExpoArcgis` (компиляция нашего Swift против ArcGIS 300.0).

**SPM / `spm_dependency` работает (главная iOS-неизвестность снята):**
- `spm_dependency` **есть** в RN 0.85.3 (`react_native_pods.rb` + `scripts/cocoapods/spm.rb`).
- `pod install` добавил `XCRemoteSwiftPackageReference` + product `ArcGIS` в Pods.xcodeproj.
- `xcodebuild` зарезолвил пакет `arcgis-maps-sdk-swift @ 300.0.0` и скачал `ArcGIS.xcframework` (срезы: ios-arm64, ios-sim arm64/x86_64, maccatalyst, xros).
- Варнинг от pod install: ArcGIS-SPM со статической линковкой *может* дать линкер-ошибки (совет — `USE_FRAMEWORKS=dynamic`); проверяется полной сборкой приложения.

**Найдено и исправлено — 4 ошибки компиляции Swift, все сверены с `ArcGIS.swiftinterface` (ground truth из скачанного xcframework):**
1. **`Scene` ambiguous** (`ArcGIS.Scene` vs `SwiftUI.Scene` — `ExpoModulesCore` реэкспортирует SwiftUI) → квалифицировать `ArcGIS.Scene` в `SceneRef.swift` + `ExpoArcgisSceneView.swift`. (`Map` не коллидит — `SwiftUI.Map` нет.)
2. **`operationalLayers` — get-only** в Swift SDK → методы `addOperationalLayer(_:)` / `removeOperationalLayer(_:)`. (Kotlin: мутабельная коллекция `.add/.remove` — платформенное различие.)
3. **Именование 2-го view:** Swift = `ViewName("…")`, Kotlin = `Name("…")` внутри `View {}`. В Swift `Name()` — это `NameDefinition` *модуля*; `ViewDefinitionBuilder.buildExpression` его не принимает (только `ViewName`/`Events`/`Prop`/lifecycle/функции).
4. **`onSingleTapGesture` опциональность:** `MapView` отдаёт **неопциональный** `Point` (2D-тап всегда на поверхности), `SceneView`/`LocalSceneView` — `Point?` (3D-тап может промахнуться мимо глобуса) → в MapView убрать `guard let`, в SceneView оставить. `GeometryEngine.project` дженерик → для `Point` возвращает `Point?` (каст `as? Point` лишний).

5. **Deployment target app-таргета (config-plugin, не код):** ArcGIS требует iOS 17. Плагин поднимал target только у **подов** (Podfile.properties.json), а сам app-таргет в `.xcodeproj` оставался 16.4 (дефолт prebuild) → полная сборка падала: «compiling for iOS 16.4, but module 'ExpoArcgis' has a minimum deployment target of iOS 17.0» (на `ExpoModulesProvider.swift`, который импортирует наш модуль). Фикс: `withArcGISIos` теперь `withXcodeProject` поднимает `IPHONEOS_DEPLOYMENT_TARGET` ≥ 17.0 во всех build-конфигах app-проекта (в дополнение к Podfile.properties).

**Итог:**
- `xcodebuild -scheme ExpoArcgis ... BUILD SUCCEEDED` — весь Swift корректен против ArcGIS 300.0 + ExpoModulesCore (импорт ArcGIS через SPM, `Map`/`Scene`, `MapView`/`SceneView` SwiftUI-хостинг, `GeometryEngine.project`, `GraphicsOverlay`/`SimpleMarkerSymbol`, `APIKey`, `SharedObject`-подклассы, `Class`/`Constructor`/`Prop`/`ViewName`).
- `xcodebuild -scheme expoarcgisexample ... IPHONEOS_DEPLOYMENT_TARGET=17.0 ... BUILD SUCCEEDED` — **полное приложение собрано и слинковано**. ArcGIS xcframework линкуется **статически** без проблем — варнинг pod install про static linking несущественен, `USE_FRAMEWORKS=dynamic` НЕ нужен.
- Единственным барьером дефолтного `expo prebuild && run:ios` был deployment target app-таргета (фикс #5 в плагине).

**Журнал:**
- **2026-06-04** — iOS верифицирован end-to-end (Xcode 26.5). Схема ExpoArcgis + полное приложение (iOS 17) — BUILD SUCCEEDED. `spm_dependency` подцепил ArcGIS 300.0, статическая линковка ОК (dynamic не нужен). Swift-фиксы: `ArcGIS.Scene` (ambiguity), `addOperationalLayer` (get-only), `ViewName` (vs Kotlin `Name`), `onSingleTapGesture` опциональность (MapView Point / SceneView Point?). Plugin-фикс: `withXcodeProject` поднимает `IPHONEOS_DEPLOYMENT_TARGET`=17 у app-таргета (проверено: prebuild пишет 17.0 в `.xcodeproj` + Podfile.properties).

## 13. Maps 2D — маппинг сэмплов (методология) + «Add a point, line, and polygon» ✅

Методология (с этого этапа): ссылка на сэмпл ArcGIS (Swift+Kotlin почти совпадают) → surf исходника → маппинг классов сэмпла в декларативный модуль зеркально обе платформы → демо в `example/App.tsx` → апрув → следующий сэмпл. Сейчас идём по **2D**, по одному сэмплу.

**«Display a map»** — уже покрыт (Map + MapView + Basemap + initialViewpoint + APIKey); `App.tsx` его демонстрирует.

**«Add a point, line, and polygon»** — реализован и верифицирован (TS + Android + iOS):
- **API.** `Graphic` стал `{ geometry, symbol }` (было `{ point, symbol }`):
  - `Geometry` — union с дискриминатором `type` (как ArcGIS JS): `point` | `polyline` | `polygon`. `Point` теперь `{ x, y, spatialReference? }` (нативный `Point(x:y:spatialReference:)`), `x`=долгота, `y`=широта; polyline/polygon = `{ points: Point[], spatialReference? }`.
  - `Symbol` — union: `simple-marker` (style/color/size/outline) | `simple-line` (style/color/width) | `simple-fill` (style/color/outline). `Stroke` — общий тип для line-символа и `outline`. Цвет — hex `#RRGGBB(AA)`, alpha-last на обеих платформах.
  - `TapEventPayload.mapPoint` оставлен географическим `{ latitude, longitude }` (нативный tap НЕ трогали — вне сэмпла); в демо тап→точка маппится `x: lon, y: lat`.
- **Натив** (`GraphicRef.applyProps` строит geometry/symbol по `type`):
  - Swift: `Polyline(points:)` / `Polygon(points:)`; `SimpleMarkerSymbol(style:color:size:)` + `.outline`, `SimpleLineSymbol(style:color:width:)`, `SimpleFillSymbol(style:color:outline:)`; `SpatialReference.wgs84` / `.webMercator`.
  - Kotlin: `PolylineBuilder`/`PolygonBuilder` + `addPoint(x,y)` + `.toGeometry()`; `SimpleMarkerSymbol(...).apply { outline = … }`, `SimpleFillSymbol(style, color, outline)`; `Color.fromRgba`.
- **Демо** (`App.tsx`): статичные точка/линия/полигон по координатам туториала (Santa Monica Mountains) + tap→pin.
- **Найдено при сборке** (сверено по `ArcGIS.swiftinterface`): «нет линии/заливки» в Swift = `.noLine` / `.noFill` (НЕ `.null`, компилятор без подсказки); в Kotlin — `SimpleLineSymbolStyle.Null` / `SimpleFillSymbolStyle.Null`. Дискриминатор сделал `'none'` (как web ArcGIS JS) → маппинг `none` → `.noLine`/`.noFill` (Swift) / `.Null` (Kotlin). Marker-кейсы (circle/cross/diamond/square/triangle/x) совпали как есть.
- **Инфра-замечание:** фоновый `pod install` в песочнице не персистил `Pods/`+workspace на реальный диск → iOS-сборку гонять с реальной записью (вне песочницы), workspace — абсолютным путём (`cd` в песочнице не применяется).

**Верификация:** TS (типы + `App.tsx`) ✅ · Android `:expo-arcgis:compileDebugKotlin` BUILD SUCCESSFUL ✅ · iOS `xcodebuild -scheme expoarcgisexample` (полное приложение, ArcGIS через SPM) **BUILD SUCCEEDED** ✅.

**Журнал:**
- **2026-06-04** — старт маппинга 2D-сэмплов. «Display a map» — уже покрыт. «Add a point, line, and polygon»: `Graphic` → `geometry` (point/polyline/polygon) + `symbol` (marker/line/fill), `Point`→`{x,y,sr}`, дискриминаторы как в ArcGIS JS. Build-фиксы: Swift `.noLine`/`.noFill` (не `.null`), значение стиля `'none'`. Верифицировано на всех трёх таргетах (TS / Android / iOS BUILD SUCCEEDED).

## 14. 2D-сэмплы (план: viewpoint / web map / layers / renderer / device location)

План `frolicking-twirling-widget` одобрен. Идём по 5 сэмплам, фокус — **2D-путь** (`MapView`/`Map`/`GraphicsOverlay`); SceneView-специфика (камера 3D, локация на сцене — другой API) отложена до фазы Scene. Где общая архитектура (`GeoModelRef`/`GraphicsOverlayRef`) даёт 3D бесплатно — работает и там.

### Сэмпл «Change viewpoint» ✅
- **API:** рантайм-проп `viewpoint?: Viewpoint` на `<MapView>` (вид анимируется к нему при изменении значения; `initialViewpoint` у `<Map>` — стартовый). `MapView.tsx` уже спредит пропсы — JS-обвязку менять не пришлось.
- **Натив:**
  - Kotlin (традиционный `com.arcgismaps.mapping.view.MapView`): `mapView.setViewpointAnimated(Viewpoint(lat, lon, scale), 0.5f)` в `scope.launch`.
  - Swift (SwiftUI): контейнер обёрнут в `MapViewReader { proxy in … }`; модель хранит `viewpoint` + счётчик версий; `.task(id: viewpointVersion) { _ = await proxy.setViewpoint(vp, duration: 0.5) }`.
  - `Prop("viewpoint")` на обоих view (dict lat/lon/scale).
- **Демо:** две кнопки-пресета (Santa Monica / Griffith Obs.) → `setViewpoint`.
- **Верификация:** TS ✅ · Android `:expo-arcgis:compileDebugKotlin` BUILD SUCCESSFUL ✅ · iOS `xcodebuild -scheme ExpoArcgis` BUILD SUCCEEDED ✅ (`MapViewReader` / `MapViewProxy.setViewpoint(_:duration:)` подтверждены).

### Сэмпл «Display a web map / PortalItem» ✅
- **API:** `portalItem?: { itemId; portalUrl? }` на `<Map>` (конструктор-онли — карта строится из веб-карты, `basemap` игнорируется; смена источника — ремоунт через `key`). `Map.tsx` уже передаёт пропсы в конструктор — JS-обвязку не трогал.
- **Натив (`MapRef` строит карту в init по `portalItem`):**
  - Swift: `Map(item: PortalItem(portal: .arcGISOnline(connection: .anonymous), id: PortalItem.ID(itemId)!))`; кастомный `portalUrl` → `Portal(url:connection:)`.
  - Kotlin: `ArcGISMap(PortalItem(Portal(portalUrl, Portal.Connection.Anonymous), itemId))` в `buildMap(...)`.
  - Оба module-конструктора передают `portalItem` в `MapRef(...)`.
- **Демо:** кнопка-тоггл «Web map»/«Basemap» (ремоунт `<Map>` через `key`), публичный web-map id.
- **Build-фикс:** Kotlin `PortalItem` — в пакете **`com.arcgismaps.mapping`** (НЕ `com.arcgismaps.portal`; `Portal` — там). Сверено по jar `arcgis-maps-kotlin-300.0.0`. Swift собрался сразу.
- **Верификация:** TS ✅ · Android `:expo-arcgis:compileDebugKotlin` BUILD SUCCESSFUL ✅ · iOS `-scheme ExpoArcgis` BUILD SUCCEEDED ✅.
