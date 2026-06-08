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

### Сэмпл «Manage operational layers» (MapImageLayer) ✅
- Декларативный add/remove слоёв + `visible`/`opacity` уже были (Phase 2; Swift `addOperationalLayer`/`removeOperationalLayer`, Kotlin мутабельный `operationalLayers`). Сэмпл добавил **новый тип слоя** `ArcGISMapImageLayer` (динамический map service). Порядок (z-index) = порядок монтирования детей `<Map>`.
- **API:** `<MapImageLayer url=… opacity? visible? />` — зеркало `<TileLayer>` (через `useGeoModel()` → addLayer/removeLayer; работает в 2D и 3D — общий `GeoModelRef`).
- **Натив:** `MapImageLayerRef(url)` → Swift `ArcGISMapImageLayer(url: URL(string:)!)`, Kotlin `ArcGISMapImageLayer(url)`; `Class(MapImageLayerRef)` + JS-конструктор.
- **Демо:** кнопка-тоггл «USA layer» (mount/unmount = add/remove слоя).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (`ArcGISMapImageLayer` верен на обеих платформах).

### Сэмпл «Style graphics with renderer» ✅
- **API:** `renderer?: Renderer` на `<GraphicsOverlay>`. `Renderer` (v1) = `SimpleRenderer` = `{ type: 'simple'; symbol: Symbol }`. Графика без своего `symbol` рисуется символом рендерера (работает в 2D и 3D — overlay общий).
- **Натив:** `GraphicsOverlayRef.setRenderer(...)` → `overlay.renderer = SimpleRenderer(buildSymbol(symbol))` (Swift `SimpleRenderer(symbol:)`, Kotlin `SimpleRenderer(symbol)`) — **переиспользует существующий `buildSymbol`**. `Function("setRenderer")`; `GraphicsOverlay.tsx` шлёт renderer через `useEffect`.
- **Демо:** второй `<GraphicsOverlay renderer={GREEN_RENDERER}>` с symbol-less графикой (зелёные ромбы).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (`SimpleRenderer` верен на обеих платформах).

### Сэмпл «Show device location» ✅
- **API:** `locationDisplay?: { autoPanMode?; showLocation? }` на `<MapView>` (наличие пропа = локация включена, стартует GPS). `autoPanMode`: `off`/`recenter`/`navigation`/`compassNavigation`.
- **Натив:**
  - Kotlin (традиционный MapView): `mapView.locationDisplay.setAutoPanMode(LocationDisplayAutoPanMode.X)` + `showLocation` + `dataSource.start()/.stop()` в корутине. `LocationDisplayAutoPanMode` — в пакете `com.arcgismaps.location`.
  - Swift (SwiftUI): `LocationDisplay(dataSource: SystemLocationDataSource())` в модели; модификатор `.locationDisplay(model.locationDisplay)`; start/stop в `.task(id: locationEnabled)`; `autoPanMode` / `showsLocation`.
  - `Prop("locationDisplay")` на MapView.
- **Пермишены:** плагин (проп `locationWhenInUseUsageDescription` в `app.config.js`) пишет Info.plist `NSLocationWhenInUseUsageDescription` + Android `ACCESS_FINE/COARSE_LOCATION`. Рантайм-запрос Android — в демо через `PermissionsAndroid` (RN core, без новых зависимостей/подов); iOS спросит сам при `start()`. **Для рантайма нужен свежий `expo prebuild`** (текущие example/ios|android собраны без этих entries).
- **Демо:** кнопка «My location» (Android запрашивает пермишен → включает локацию).
- **Build-фикс:** Swift `func locationDisplay(_:) -> MapView` — **builder-метод**, возвращает `MapView`, поэтому звать его надо на `MapView` **до** SwiftUI-модификаторов (`.task`), иначе `'some View' has no member 'locationDisplay'`. Сверено по `ArcGIS.swiftinterface`. Kotlin собрался сразу.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

**Итог §14:** все 5 сэмплов 2D-плана (viewpoint, web map, MapImageLayer, renderer, device location) реализованы, замаплены 1:1 Swift+Kotlin и верифицированы (TS / Android `:expo-arcgis:compileDebugKotlin` / iOS `-scheme ExpoArcgis`). SceneView-специфика (3D-камера, локация на сцене) отложена до фазы Scene; renderer и MapImageLayer работают в 3D автоматически (общие `GraphicsOverlayRef`/`GeoModelRef`).

## 15. 3D-сцены (Scenes 3D)

3D-фаза (после 2D). Те же принципы; ключевое: **камера и рельеф — свойства `Scene`, не `SceneView`**. Минимальные `Scene`/`SceneView` уже были; слои/графика/renderer работают под Scene через общие `GeoModelRef`/`GraphicsOverlayRef`.

### Сэмпл «Display a scene» ✅
- **API:** на `<Scene>` добавлены `camera?: Camera` и `surface?: Surface`; `Point` получил `z?` (высота). `Camera = { position: Point; heading?; pitch?; roll? }`; `Surface = { elevationSources?: {url}[]; elevationExaggeration? }`.
- **Натив (`SceneRef.applyProps`):**
  - Рельеф: `Surface()` + `ArcGISTiledElevationSource(url)` + `elevationExaggeration` → `scene.baseSurface`. (Swift `surface.addElevationSource(...)`, Kotlin `surface.elevationSources.add(...)`.)
  - Камера: `Camera(location/locationPoint: Point(x,y,z), heading, pitch, roll)` → `scene.initialViewpoint = Viewpoint(boundingGeometry: point, camera:)` (Swift) / `Viewpoint(point, camera)` (Kotlin).
  - `SceneView` и модули НЕ трогал (всё на `Scene`/`SceneRef`).
- **Kotlin-пакеты (сверены по jar `arcgis-maps-kotlin-300.0.0`):** `Camera` → `com.arcgismaps.mapping.view`; `Surface` и `ArcGISTiledElevationSource` → `com.arcgismaps.mapping`.
- **Демо:** тоггл «3D scene» / «2D map» (общие графики-overlays в обоих); сцена `arcGISImagery` + камера (Santa Monica, pitch 72°) + рельеф WorldElevation3D (exaggeration 2.5).
- **Верификация:** TS ✅ · Android `:expo-arcgis:compileDebugKotlin` BUILD SUCCESSFUL ✅ · iOS `-scheme ExpoArcgis` BUILD SUCCEEDED ✅ (Swift собрался сразу — туториал-код лёг 1:1).

### Остаток 3D пачкой (план одобрен) — web scene / runtime-камера / scene layer / свет-тени; DEFER: mobile package, AR, local scene+BuildingSceneLayer (нет `LocalSceneView` в Swift), image overlay.

#### Сэмпл «Display a web scene» ✅
- **API:** `portalItem?: PortalItem` на `<Scene>` (зеркало `Map.portalItem`). `SceneRef` строит `Scene(item: PortalItem(...))` в init (Swift) / `buildScene(...)` (Kotlin); оба module Scene-Constructor'а передают `portalItem`.
- **Демо:** в 3D-режиме кнопка «Web scene»/«Built scene» (ремоунт `<Scene>` через `key`), публичный web-scene id `579f97b2…`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (точный паттерн web map — собралось сразу).

#### Сэмпл «Change camera controller» (runtime-камера) ✅
- **API:** `camera?: Camera` на `<SceneView>` — вид анимируется к ней при изменении (зеркало `viewpoint` у MapView; `<Scene camera>` остаётся стартовой).
- **Натив:** Swift `SceneViewReader { proxy in … }` + `.task(id: cameraVersion) { proxy.setViewpointCamera(camera, duration: 0.5) }` (core, как `MapViewReader`); Kotlin `sceneView.setViewpointCameraAnimated(Camera(point, h, p, r), 0.5f)` (метод подтверждён `javap`). `Prop("camera")` на SceneView.
- **Демо:** в 3D кнопки «Cam N»/«Cam E» (разные ракурсы над Санта-Моникой). *(Orbit/Globe cameraControllers — в DEFER.)*
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (`SceneViewReader`/`SceneViewProxy.setViewpointCamera` — core, собралось сразу).

#### Сэмпл «Scene layer» (ArcGISSceneLayer) ✅
- **API:** `<SceneLayer url=… opacity? visible? />` → `ArcGISSceneLayer` (3D-объекты/integrated mesh; глобальный SceneView). Зеркало `<MapImageLayer>` (через `useGeoModel()` → addLayer; работает под Scene и Map).
- **Натив:** `SceneLayerRef(url)` (Swift `ArcGISSceneLayer(url: URL(string:)!)`, Kotlin `ArcGISSceneLayer(url)`, пакет `com.arcgismaps.mapping.layers`) + `Class(SceneLayerRef)` + JS-конструктор.
- **Демо:** кнопка «Buildings» (SF-здания scene service) + автоперелёт камеры в SF.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

#### Сэмпл «Show realistic light and shadows» ✅
- **API:** на `<SceneView>`: `sunLighting?: 'off'|'light'|'lightAndShadows'`, `atmosphereEffect?: 'off'|'horizonOnly'|'realistic'`, `sunTime?: number` (epoch ms).
- **Натив:**
  - Swift: builder-модификаторы `.sunLighting(SceneView.SunLighting)`, `.atmosphereEffect(SceneView.AtmosphereEffect)`, `.sunDate(Date)` — возвращают `SceneView`, поэтому ставятся **до** SwiftUI-`.task` (сверено по `ArcGIS.swiftinterface`). Кейсы `.off/.light/.lightAndShadows`, `.off/.horizonOnly/.realistic`.
  - Kotlin (view-based): `sceneView.sunLighting = LightingMode.{NoLight,Light,LightAndShadows}`, `atmosphereEffect = AtmosphereEffect.{None,HorizonOnly,Realistic}`, `sunTime = Instant.ofEpochMilli(ms)` (sealed-классы + пакет `com.arcgismaps.mapping.view` сверены по jar).
  - `Prop("sunLighting"/"atmosphereEffect"/"sunTime")` на SceneView.
- **Демо:** кнопка «Shadows» (lightAndShadows + realistic + фикс. sunTime).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (всё сверено по jar/swiftinterface — собралось сразу).

**Итог 3D-пачки:** 4 in-scope сэмпла (web scene · runtime-камера · scene layer · свет/тени) — готовы и верифицированы (TS / Android `:expo-arcgis:compileDebugKotlin` / iOS `-scheme ExpoArcgis`). **DEFER (вне v1):** mobile scene package (offline `.mspk`), AR tabletop (toolkit + ARKit/ARCore), local scene + BuildingSceneLayer + filter (нет `LocalSceneView` в Swift SDK), image overlay, orbit/globe camera controllers.

## 16. Раздел Layers — пачка типов слоёв (план одобрен)

Объём: все URL-слои + прямой offline (Shapefile/KML/local-raster). **DEFER:** GeoPackage/Geodatabase (async-контейнеры: load → выбрать таблицу), OGC/WFS (async populate) — нужна async-layer архитектура; BuildingSceneLayer/ENC/Annotation/Dimension/DynamicEntity/GroupLayer/FeatureCollection — нишевое. Все конструкторы сверены: Swift — по `ArcGIS.swiftinterface` (агенты ошибочно говорили, что WFS/OGC/OSM нет в Swift — **есть**), Kotlin — по jar. JS-обвязка слоёв — через фабрику `createLayerComponent` (DRY вместо 6 копий).

### Группа 1 — простые URL-слои ✅
- **Компоненты:** `<VectorTileLayer url>` · `<IntegratedMeshLayer url>` (3D) · `<PointCloudLayer url>` (3D) · `<Ogc3DTilesLayer url>` (3D) · `<WebTiledLayer urlTemplate>` · `<OpenStreetMapLayer/>`.
- **Натив (`XxxLayerRef`, пакет `com.arcgismaps.mapping.layers`):** `ArcGISVectorTiledLayer(url)` · `IntegratedMeshLayer(url)` · `PointCloudLayer(url)` · Swift `OGC3DTilesLayer(url:)` / Kotlin `Ogc3DTilesLayer(uri)` (casing!) · Swift `WebTiledLayer(urlTemplate:)` / Kotlin `WebTiledLayer.create(urlTemplate)` (Kotlin — abstract+factory) · `OpenStreetMapLayer()` (есть в обоих SDK; Kotlin — public no-arg).
- **JS:** `createLayerComponent(makeRef)` (`src/createLayerComponent.tsx`) — обвязка `useGeoModel`+addLayer+diff один раз; компоненты в `src/layers.tsx`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (с первого раза). Демо для слоёв — курировано в конце батча (чтобы не раздувать панель).

### Группа 2 — WMS / WMTS ✅
- `<WmsLayer url layerNames={string[]}>` → Swift `WMSLayer(url:layerNames:)`, Kotlin `WmsLayer(url, layerNames)`. `<WmtsLayer url layerId>` → Swift `WMTSLayer(url:layerID:)`, Kotlin `WmtsLayer(url, layerId)`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Группа 3 — RasterLayer (source-union) ✅
- `<RasterLayer source={ type:'imageService', url } | { type:'file', path }>` → `RasterLayer(raster:)` с `ImageServiceRaster(url)` или локальным `Raster(fileURL:)` (Swift) / `Raster.createWithPath(path)` (Kotlin). `Raster`/`ImageServiceRaster` — пакет `com.arcgismaps.raster`; Swift `Raster` — конкретный класс с `init(fileURL:)`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Группа 4 — KmlLayer ✅
- `<KmlLayer url>` (remote `.kml`/`.kmz` или локальный файл) → `KMLLayer(dataset: KMLDataset(url:))` (Swift) / `KmlLayer(KmlDataset(uri))` (Kotlin). `KmlDataset` — пакет `com.arcgismaps.mapping.kml`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Группа 5 — FeatureLayer: полиморфный источник (+ Shapefile) ✅
- `<FeatureLayer>` обобщён: `source?: { type:'service'; url } | { type:'shapefile'; path }` + `url?` как shorthand сервиса (старый API не сломан). Натив `FeatureLayerRef(props)` строит таблицу: service → `ServiceFeatureTable(url)`, shapefile → `ShapefileFeatureTable(fileURL/path)` (синхронно, слой грузит сам). Swift `FeatureLayer(featureTable: FeatureTable)`, Kotlin `FeatureLayer.createWithFeatureTable(...)`. `FeatureTable`/`ShapefileFeatureTable` — пакет `com.arcgismaps.data`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

**Итог раздела Layers:** ~11 новых типов слоёв (vector tile · integrated mesh · point cloud · 3D tiles · web tiled · OSM · WMS · WMTS · raster[image-service|file] · KML · FeatureLayer+shapefile) — все URL/прямой-offline, через фабрику `createLayerComponent` (DRY). Все собрались с минимумом итераций (конструкторы добиты по swiftinterface/jar заранее). Демо: 1 репрезентативный тоггл «WMS» в 2D (остальные слои экспортированы и compile-верифицированы — без раздувания кнопочной панели). **DEFER (вне v1):** GeoPackage/Geodatabase (async-контейнеры: load→таблица), OGC/WFS (async populate) — нужна async-layer архитектура; BuildingSceneLayer/ENC/Annotation/Dimension/DynamicEntity/GroupLayer/FeatureCollection — нишевое.

## 17. Раздел Geometry & spatial reference (план одобрен, 4 фазы)

Объём (план `frolicking-twirling-widget.md`): (1) кодек геометрии + расширенные типы · (2) `GeometryEngine` namespace · (3) `CoordinateFormatter` namespace · (4) интерактивный `<GeometryEditor>`. Императивные функции (через module `Function`) + один view-компонент. Сигнатуры сверены: Kotlin `GeometryEngine` — **object** (`area`, `bufferOrNull`, `projectOrNull`, relational `contains(a,b)`…); Swift — статические `GeometryEngine.area(of:)`/`.buffer(around:distance:)`/`.project(_:into:)`.

### Фаза 1 — кодек геометрии + типы ✅
- **TS (`ExpoArcgis.types.ts`):** `Geometry` union расширен — добавлены `multipoint` и `envelope`; у `Polyline`/`Polygon` `points` стал опциональным + добавлен `parts?: Point[][]` (мультичасть, для результатов движка; `points` — одночастный shorthand, графику не ломает). Новые типы `Multipoint`/`Envelope`.
- **Натив — общий кодек `GeometryCodec.swift`/`.kt` (новые файлы):**
  - `geometryFromDict(dict) -> Geometry?` — парсит point/multipoint/polyline/polygon/envelope (точки `points` ИЛИ мультичасть `parts`).
  - `dictFromGeometry(geometry) -> dict` — **сериализатор**: по типу (Swift `as? Point/Multipoint/...`, Kotlin `when(is …)`) собирает JSON; polyline/polygon → `parts`; envelope → xMin/yMin/xMax/yMax; + `spatialReference` (wkid).
  - SR: only WGS84/WebMercator по имени, иначе из wkid.
- **GraphicRef переключён на кодек** (Swift+Kotlin): теперь рисует и результаты движка (мультичасть). Старые `buildGeometry`/`vertices`/`spatialReference`/`number` (Swift) и `buildGeometry`/`vertices`/`spatialReference` (Kotlin) удалены; `num`/`buildSymbol` остались.
- **API сверено по jar/swiftinterface (важные находки):**
  - Kotlin: `Multipoint(Iterable<Point>, SpatialReference)`; `Polyline/Polygon(Iterable<MutablePart>)` (мультичасть) или `(Iterable<Point>, SR)` (одночасть); `MutablePart(SR)` + `addPoint(Point)`; `Envelope(Point, Point)` (две угловые точки); `SpatialReference.wgs84()/.webMercator()` — **Companion-функции** + `SpatialReference(wkid:Int)`; `Multipart.parts: PartCollection` (Iterable<MutablePart>, у каждой `.points`); read-back через `when(is Point/Multipoint/Polygon/Polyline/Envelope)` (`Geometry` — sealed, `objectType` — internal/нельзя).
  - Swift: `Multipoint(points:)`; `Polyline/Polygon(parts: some Sequence<MutablePart>)`; `MutablePart(spatialReference:)` + **`part.points.append(...)`** (нет `addPoint`; `PointView : RangeReplaceableCollection`); `Envelope(xMin:yMin:xMax:yMax:spatialReference:)` (z/m опц.); **нет `Point.hasZ`** → `if let z = point.z`; `SpatialReference.wkid: WKID?` (struct) → для JS `wkid?.rawValue`; `SpatialReference(wkid: WKID)` — **failable** (`?? .wgs84`); `WKID(_ :Int)` — failable.
- **Верификация:** TS ✅ · Android `:expo-arcgis:compileDebugKotlin` ✅ · iOS `-scheme ExpoArcgis` BUILD SUCCEEDED ✅. **Гоча:** добавление нового нативного Swift-файла требует `pod install` (иначе «cannot find … in scope»); `pod install` падает на не-UTF-8 локали → запускать с `LANG/LC_ALL=en_US.UTF-8`.

### Фаза 2 — GeometryEngine namespace ✅
- **JS:** объект `geometryEngine` (`src/geometryEngine.ts`, экспортирован из index) — ~37 операций: `project` · `buffer`/`geodesicBuffer` · `area`/`geodesicArea` · `length`/`geodesicLength` · `distance`/`geodesicDistance` · `union`/`intersect`/`difference`/`symmetricDifference`/`clip`/`cut`/`convexHull`/`boundary`/`simplify`/`densify`/`generalize`/`offset`/`combineExtents` · предикаты `contains`/`crosses`/`disjoint`/`equals`/`intersects`/`overlaps`/`touches`/`within`/`relate`/`isSimple` · `nearestCoordinate`/`nearestVertex` · `move`/`rotate`/`scale`. Геодезические берут опц. `unit`/`curveType` (строки).
- **Натив:** свободные функции `geXxx` в `GeometryEngineFunctions.swift`/`.kt` (декод через кодек → `GeometryEngine` → энкод), зарегистрированы как module `Function("geXxx", …)` (Swift — прямой ref на функцию; Kotlin — `::geXxx`). Юнит-хелперы (`linearUnit`/`areaUnit`/`angularUnit`/`curveType`/`offsetType`) + `spatialReference(wkid:)` добавлены в кодек.
- **API-нюансы (сверено по jar/swiftinterface):**
  - **Swift** `GeometryEngine` — `enum` со static-методами с «фразовыми» именами: `area(of:)`, `buffer(around:distance:)`, `project(_:into:)`, предикаты `doesGeometry(_:contain:)` / `isGeometry(_:crossing:|disjointWith:|equivalentTo:|intersecting:|overlapping:|touching:|within:|relatedTo:byRelation:)`, `cut(_:usingCutter:)`, `nearestCoordinate(in:to:)`. Юниты — static `LinearUnit.meters/.kilometers/.feet/.miles`, `AreaUnit.square*`, `AngularUnit.degrees`; `GeometryEngine.GeodeticCurveType`/`.OffsetType` (вложенные enum). `GeodeticDistanceResult.{distance,azimuth1,azimuth2}` — `Foundation.Measurement` → `.value`. `ProximityResult.{coordinate:Point, distance:Double}`.
  - **Kotlin** `GeometryEngine` — **object** (singleton): `area`, `bufferOrNull`, `projectOrNull`, `*OrNull` для всех возвращающих геометрию, `union(a,b)`/`unionOrNull(Iterable)`, `tryCut` (нет `cut`), `move`/`rotate`/`scale` (non-null; у rotate/scale origin обязателен, но есть default-перегрузка — вызываю 2/3-арную при null). Юниты — `LinearUnit(LinearUnitId.Meters)` / `AreaUnit(AreaUnitId.SquareMeters)` / `AngularUnit(AngularUnitId.Degrees)`; `GeodeticCurveType.Geodesic…`, `GeometryOffsetType.Mitered…` (sealed-объекты). `GeodeticDistanceResult.{distance,azimuth1,azimuth2}` — плоские Double.
  - `Function("name", freeFunc)` (Swift) и `Function("name", ::freeFunc)` (Kotlin) — **компактная регистрация без лямбд** работает в Expo.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (BUILD SUCCEEDED). Демо — курировано в конце раздела (Фаза 4), как в Layers.

### Фаза 3 — CoordinateFormatter namespace ✅
- **JS:** объект `coordinateFormatter` (`src/coordinateFormatter.ts`, экспортирован) — `toLatitudeLongitude`/`fromLatitudeLongitude` · `toMgrs`/`fromMgrs` · `toUsng`/`fromUsng` · `toUtm`/`fromUtm`. `to*` берут `PointGeometry` (+ опц. формат/precision/addSpaces) → `string|null`; `from*` берут строку (+ опц. `spatialReference` WKID, дефолт 4326) → `PointGeometry|null`.
- **Натив:** `cfXxx` в `CoordinateFormatterFunctions.swift`/`.kt`, зарегистрированы как `Function`. Enum-мапперы (`latitudeLongitudeFormat`/`utmConversionMode`/`mgrsConversionMode`) — в кодеке.
- **API-нюансы:**
  - **Swift** `CoordinateFormatter` — `enum`, static: `latitudeLongitudeString(from:format:decimalPlaces:)`, `mgrsString(from:conversionMode:precision:addSpaces:)`, `usngString(from:precision:addSpaces:)`, `utmString(from:conversionMode:addSpaces:)`, `point(fromLatitudeLongitudeString:spatialReference:)` / `point(fromMGRSString:spatialReference:conversionMode:)` / `point(fromUSNGString:spatialReference:)` / `point(fromUTMString:spatialReference:conversionMode:)`. Enum: `LatitudeLongitudeFormat.{decimalDegrees,degreesDecimalMinutes,degreesMinutesSeconds}`, `UTMConversionMode.{latitudeBandIndicators,northSouthIndicators}`, `MGRSConversionMode.{automatic,…}`.
  - **Kotlin** `CoordinateFormatter` — **object**: `toLatitudeLongitudeOrNull(Point, fmt, Int)`, `toMgrsOrNull(Point, mode, Int, Bool)`, `toUsngOrNull(Point, Int, Bool)`, `toUtmOrNull(Point, mode, Bool)`, `fromLatitudeLongitudeOrNull(String, SR)`, `fromMgrsOrNull(String, SR, mode)`, `fromUsngOrNull(String, SR)`, `fromUtmOrNull(String, SR, mode)`. **`from*` берут non-null `SpatialReference`** → дефолтим WGS84 (wkid 4326). Enum — sealed-объекты `LatitudeLongitudeFormat.DecimalDegrees`, `UtmConversionMode.LatitudeBandIndicators`, `MgrsConversionMode.Automatic`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅ (BUILD SUCCEEDED). Демо — в Фазе 4.

### Фаза 4 — `<GeometryEditor>` (интерактивный) ✅
- **API:** `<GeometryEditor type onGeometryChange active />` — дочерний компонент `<MapView>` (forwardRef), рисует геометрию. `type: 'point'|'multipoint'|'polyline'|'polygon'|'envelope'`; `active` (дефолт true) запускает/останавливает; `onGeometryChange(geometry|null)`. Императивный `ref` → `undo`/`redo`/`clear`/`deleteSelectedElement`/`stop()`.
- **Натив:** `GeometryEditorRef` (SharedObject) держит `GeometryEditor`, **сам эмитит** `onGeometryChange` (через `emit`); привязывается к MapView. Методы `start(type)`/`stop()`/`clearGeometry()`/`undo()`/`redo()`/`deleteSelectedElement()`.
  - **Swift:** `editor.$geometry` — `AsyncStream<Geometry?>`, читаю в `Task { for await … }`, `emit(event:payload:)` (отмена в `sharedObjectWillRelease`). `editor.start(withType: Polygon.self)` (**метатип** `Geometry.Type`). View: builder-модификатор `MapView(...).geometryEditor(model.geometryEditor)` (рядом с `.locationDisplay`).
  - **Kotlin:** `editor.geometry` — `StateFlow`, `collect` в `CoroutineScope` (cancel в `deallocate()`). `editor.start(GeometryType.Polygon)`. View: `mapView.geometryEditor = ref?.editor`.
- **События SharedObject:** Swift `SharedObject.emit(event:payload:)` / Kotlin `emit(event, payload)`; JS `SharedObject extends EventEmitter` → `ref.addListener(name, cb)`. JS-класс типизирован `SharedObject<{ onGeometryChange(payload:{geometry?})}>`.
- **Контекст:** `GeoViewHost = GraphicsOverlayHost & GeometryEditorHost`; `<GeometryEditor>` биндится через `useGeoView().setGeometryEditor()`. **SceneView НЕ поддерживает редактор** (нет `geometryEditor` ни в Swift, ни в Kotlin SceneView) → у SceneView `setGeometryEditor` — no-op (3D-редактирование = DEFER).
- **Демо (`example/App.tsx`):** кнопка «Buffer pin» (geodesicBuffer 500 м тапнутого пина + coordinate-строка) и тоггл «Draw»/«Done» (`<GeometryEditor type="polygon">` → площадь скетча через `geodesicArea`).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

**Гочи (Фаза 4):**
- **JVM `MethodTooLargeException`:** `definition()` главного Kotlin-модуля превысил 64KB после ~45 Function-регистраций. **Решение:** вынес GeometryEngine+CoordinateFormatter во **второй Expo-модуль** `ExpoArcgisGeometry` (`ExpoArcgisGeometryModule.kt`/`.swift`, добавлен в `expo-module.config.json`); JS `geometryEngine`/`coordinateFormatter` → `requireNativeModule('ExpoArcgisGeometry')`. iOS-лимита нет, но второй модуль сделан и на Swift для паритета.
- **Swift `Events(...)` НЕ элемент `Class`-блока** (только Module/View) → `static method 'buildExpression' requires EventsDefinition conform to ClassDefinitionElement`. Для SharedObject-событий на Swift `Events` НЕ объявляется (emit+addListener достаточно). В Kotlin `Class { Events("…") }` — допустимо.

---

## Итог раздела Geometry & spatial reference ✅
4 фазы, все верифицированы (TS / Android `:app:compileDebugKotlin` / iOS full `-scheme expoarcgisexample` — BUILD SUCCEEDED):
1. **Кодек** геометрии (Swift/Kotlin, decode+encode, multipoint/envelope/multi-part `parts`) + расширенные TS-типы; `GraphicRef` переключён на кодек (рисует результаты движка).
2. **`geometryEngine`** — ~37 операций (project/buffer/area/length/distance + geodesic, overlay-набор, предикаты, proximity, transforms).
3. **`coordinateFormatter`** — lat/long · MGRS · USNG · UTM (to/from).
4. **`<GeometryEditor>`** — интерактивное рисование на MapView + событие смены геометрии (SharedObject events).
**Архитектурное:** второй нативный модуль `ExpoArcgisGeometry` (обход JVM 64KB-лимита). **DEFER:** 3D-редактирование (SceneView без `geometryEditor` в SDK), выбор GeometryEditor-tool (Freehand/Reticle/Shape — дефолт VertexTool), экзотика движка (ellipse/sector/reshape/extend/cut-расширенный/auto-complete), полный список юнитов.

## 18. Раздел Styles & data visualization (план одобрен, 5 фаз)

Объём: рендереры (unique-value/class-breaks) · `TextSymbol` · подписи (labels) · кластеризация (feature reduction) · 3D-символ (`SimpleMarkerSceneSymbol`). Все классы сверены по jar/swiftinterface (есть на обеих платформах). **Ключевое:** рендереры применяются и к `GraphicsOverlay`, и к `FeatureLayer` через общий `buildRenderer` (переиспользует `buildSymbol`).

### Фаза 1 — Рендереры (union) + `FeatureLayer.renderer` ✅
- **TS `Renderer`:** к `SimpleRenderer` добавлены `UniqueValueRenderer` (`type:'unique-value'`, `fields`, `uniqueValues:[{values,symbol,label?}]`, `defaultSymbol?`, `defaultLabel?`) и `ClassBreaksRenderer` (`type:'class-breaks'`, `field`, `classBreaks:[{min,max,symbol,label?}]`, `defaultSymbol?`). `FeatureLayerProps` += `renderer?: Renderer`.
- **Натив `buildRenderer(dict)`** (рядом с `buildSymbol`, module-internal) — переиспользует `buildSymbol`; зовётся из `GraphicsOverlayRef.setRenderer` И `FeatureLayerRef.applyProps` (кейс `"renderer"`).
  - **Swift:** `UniqueValueRenderer(fieldNames:uniqueValues:defaultLabel:defaultSymbol:)`, `UniqueValue(description:label:symbol:values:)` (values — `[any Sendable]`), `ClassBreaksRenderer(fieldName:classBreaks:)` + `.defaultSymbol`, `ClassBreak(description:label:minValue:maxValue:symbol:)`. `FeatureLayer.renderer` — `var Renderer?` (settable nil). `.map(SimpleRenderer.init(symbol:))` работает.
  - **Kotlin:** `UniqueValueRenderer(Iterable<String>, Iterable<UniqueValue>, defaultLabel, defaultSymbol)` — **defaultSymbol NON-NULL обязателен** → при отсутствии передаю прозрачный маркер `SimpleMarkerSymbol(Circle, rgba(0,0,0,0), 0f)` (= Swift-nil поведение). `UniqueValue(label, description, symbol, Iterable<Any>)`, `ClassBreaksRenderer(field, Iterable<ClassBreak>)` + `defaultSymbol`, `ClassBreak(label, description, min, max, symbol)`. `FeatureLayer.setRenderer(Renderer)` non-null → null ⇒ `resetRenderer()`. **Порядок параметров UniqueValue/ClassBreak в Kotlin и Swift РАЗНЫЙ** (Kotlin label-first, Swift description-first — оба с дефолтами).
  - Unique-values приводятся к сравнимым скалярам (целые → Int, иначе Double/String) на обеих платформах.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 2 — `TextSymbol` (2D) ✅
- **TS `Symbol`:** += `TextSymbol = { type:'text'; text; color?; size?; haloColor?; haloWidth?; fontFamily?; horizontalAlignment?:'left'|'center'|'right'|'justify'; verticalAlignment?:'top'|'middle'|'bottom'|'baseline' }`.
- **Натив `buildSymbol` кейс `"text"`:** Swift `TextSymbol(text:color:size:horizontalAlignment:verticalAlignment:)` (color `UIColor`, size `CGFloat`) + `.haloColor`(UIColor?)/`.haloWidth`/`.fontFamily`. Kotlin `TextSymbol(text, Color, size:Float, HorizontalAlignment, VerticalAlignment)` + `.apply{ haloColor=Color; haloWidth; fontFamily }`. Enum-мапперы: H `left/center/right/justify`, V `top/middle/bottom/baseline` (Swift lower-case cases, Kotlin sealed `.Left/.Center/...`).
- **Нюанс:** у `TextSymbol` НЕТ `angle` в API (ни Swift, ни Kotlin) → выкинул из union.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 3 — Подписи (labels) на FeatureLayer ✅
- **TS:** `LabelDefinition = { expression; useArcade?; symbol?: TextSymbol; whereClause? }`; `FeatureLayerProps` += `labelsEnabled?`, `labels?: LabelDefinition[]`.
- **Натив `buildLabelDefinition(dict)`** (в GraphicsOverlayRef, рядом с buildSymbol/buildRenderer — чтобы звать private/internal `buildSymbol`): expression `useArcade ? ArcadeLabelExpression(str) : SimpleLabelExpression(str)`; textSymbol через `buildSymbol(...) as? TextSymbol`. Swift `LabelDefinition(labelExpression:textSymbol:)` (textSymbol **optional** — nil ⇒ дефолт SDK); Kotlin `LabelDefinition(LabelExpression, TextSymbol)` (**non-null** → дефолт `TextSymbol("", black, 12f, Center, Middle)`). `whereClause` через setter.
- **FeatureLayerRef.applyProps:** `"labelsEnabled"` → Swift `labelsAreEnabled` / Kotlin `labelsEnabled`; `"labels"` → Swift `removeAllLabelDefinitions()` + `addLabelDefinition`, Kotlin `labelDefinitions.clear()` + `.add`.
- **API:** `SimpleLabelExpression(simpleExpression:)`/`ArcadeLabelExpression(arcadeString:)` (Swift), `SimpleLabelExpression(String)`/`ArcadeLabelExpression(String)` (Kotlin); пакет `com.arcgismaps.mapping.labeling`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 4 — Кластеризация (feature reduction) на FeatureLayer ✅
- **TS:** `ClusterReduction = { type:'cluster'; renderer?; radius?; minSymbolSize?; maxSymbolSize?; enabled? }`; `FeatureReduction = ClusterReduction`; `FeatureLayerProps` += `featureReduction?`.
- **Натив `buildFeatureReduction(dict)`** (в GraphicsOverlayRef): `cluster` → `ClusteringFeatureReduction(renderer)` (**renderer обязателен** → дефолт `SimpleRenderer(circle, синий, 18)`), затем `radius`/`minSymbolSize`/`maxSymbolSize`/`isEnabled` через setters. Пакет `com.arcgismaps.mapping.reduction`.
- **FeatureLayerRef.applyProps:** `"featureReduction"` → `layer.featureReduction = buildFeatureReduction(...)` (nullable settable на обеих платформах — проверено).
- Swift `ClusteringFeatureReduction(renderer:)` + `.radius/.minSymbolSize/.maxSymbolSize` + `.isEnabled` (наследуется от `FeatureReduction`).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 5 — `SimpleMarkerSceneSymbol` (3D) ✅
- **TS `Symbol`:** += `SimpleMarkerSceneSymbol = { type:'simple-marker-scene'; style?:'cone'|'cube'|'cylinder'|'diamond'|'sphere'|'tetrahedron'; color?; width?; height?; depth?; anchor?:'center'|'bottom'|'top'|'origin' }`.
- **Натив `buildSymbol` кейс `"simple-marker-scene"`** (рендерится в `<SceneView>`): Swift `SimpleMarkerSceneSymbol(style:color:height:width:depth:anchorPosition:)` — **порядок height-first**; стиль `SimpleMarkerSceneSymbol.Style`, якорь `MarkerSceneSymbol.AnchorPosition` (`.top/.bottom/.center/.origin`). Kotlin `SimpleMarkerSceneSymbol(style, color:Int, width, height, depth, SceneSymbolAnchorPosition)` — **порядок width-first**; `SimpleMarkerSceneSymbolStyle.Cone…`, `SceneSymbolAnchorPosition.Bottom…`. Дефолтный цвет — светло-серый (211).
- **Демо (`example/App.tsx`):** 2D — тоггл «Cities» (`<FeatureLayer>` SampleWorldCities со `class-breaks` по `POP` + `labels` по `CITY_NAME`) + «Cluster»; `TextSymbol`-графика-подпись; 3D — отдельный overlay со `simple-marker-scene` сферой над рельефом. **Нюанс:** у label-`TextSymbol` поле `text` обязательно по типу (для подписи перекрывается expression) → в демо `text: ''`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

---

## Итог раздела Styles & data visualization ✅
5 фаз, все верифицированы (TS / Android `:app:compileDebugKotlin` / iOS full `-scheme expoarcgisexample` — BUILD SUCCEEDED):
1. **Рендереры** — `unique-value` / `class-breaks` (+ `simple`), общий `buildRenderer` на `GraphicsOverlay` И `FeatureLayer.renderer`.
2. **`TextSymbol`** (2D-подписи-графика).
3. **Labels** на FeatureLayer (`labelsEnabled` + `labels`: simple/Arcade expression + TextSymbol).
4. **Кластеризация** (`featureReduction`: ClusteringFeatureReduction + renderer + radius).
5. **`SimpleMarkerSceneSymbol`** (3D-символ-солид).
**Архитектурное:** все «build*»-кодеки (`buildSymbol`/`buildRenderer`/`buildLabelDefinition`/`buildFeatureReduction`) — module-internal в `GraphicsOverlayRef.swift`/`.kt`, переиспользуются `FeatureLayerRef`. **Порядок параметров Swift↔Kotlin расходится** у `UniqueValue`/`ClassBreak` (desc-first vs label-first) и `SimpleMarkerSceneSymbol` (height-first vs width-first) — учтено. **DEFER:** HeatmapRenderer (нет Kotlin-ctor), PictureMarkerSymbol (Kotlin BitmapDrawable/async), DictionaryRenderer + mobile-style-file/SymbolStyle (async), multilayer/CIM, ModelSceneSymbol (ассет), ImageOverlay (frames), visual variables (color/size).

## 19. Раздел Query (план одобрен, 3 фазы) — запросы через useRef

Объём: атрибутивные/пространственные запросы + статистика + Identify. **Пользователь («примени референции» = useRef):** запросы через **императивный ref** на компоненте (как у `<GeometryEditor>`). Запросы **async** (`suspend`/`async throws`) → Expo **`AsyncFunction`** → JS Promise; JS — forwardRef + useImperativeHandle. Запрос идёт на `featureLayer.featureTable` (храню ссылку в ref). Все классы сверены по jar/swiftinterface.

### Фаза 1 — Feature query на `<FeatureLayer>` ref ✅
- **TS:** `QueryParameters` (whereClause/geometry/spatialRelationship/maxFeatures/returnGeometry/objectIds/orderBy/resultOffset), `SpatialRelationship` (intersects/contains/crosses/disjoint/envelopeIntersects/equals/overlaps/touches/within/relate), `Feature = { attributes; geometry|null }`, `FeatureLayerHandle = { queryFeatures; queryFeatureCount; queryExtent }`.
- **`<FeatureLayer>` → `forwardRef`** (`useImperativeHandle` делегирует в нативный `FeatureLayerRef`).
- **Натив `QueryCodec.swift`/`.kt`:** `buildQueryParameters(dict)` + `serializeFeature` (attributes: примитивы as-is, Swift Date→epoch-ms / Kotlin non-primitive→toString; geometry → кодек). `FeatureLayerRef` хранит `table` + методы `queryFeatures`/`queryFeatureCount`/`queryExtent` (`async throws`/`suspend`). ServiceFeatureTable → `queryFeatures(..., QueryFeatureFields.LoadAll/.loadAll)` (иначе атрибуты неполные); иначе base `queryFeatures`.
- **Регистрация:** Swift `AsyncFunction("queryFeatures") { ref, q in try await ref.queryFeatures(q) }`; **Kotlin `AsyncFunction("queryFeatures") Coroutine { ref, q -> ref.queryFeatures(q) }`** — нужен `import expo.modules.kotlin.functions.Coroutine` (infix, suspend).
- **API-нюансы:** Swift `QueryParameters` `objectIDs`/`orderByFields` — **get-only** → `addObjectIDs(_:)`/`addOrderByFields(_:)`; `returnsGeometry` (не returnGeometry); `OrderBy(fieldName:sortOrder:)` + `OrderBy.SortOrder.ascending`. Kotlin `QueryParameters` `objectIds.addAll`/`orderByFields.add`, `returnGeometry`; `OrderBy(field, SortOrder.Ascending)`. **`outFields` — internal в Kotlin** → выкинут (поля через QueryFeatureFields). `FeatureQueryResult`: Swift `.features()→AnySequence<Feature>`, Kotlin `Iterable<Feature>`. `SpatialRelationship`/`SortOrder`/`QueryFeatureFields` — sealed (Kotlin) / enum (Swift). `Feature.attributes: Map<String,Any>`/`[String: any Sendable]`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 2 — Statistics query на `<FeatureLayer>` ref ✅
- **TS:** `StatisticType` (count/sum/min/max/average/standardDeviation/variance), `StatisticDefinition = { field; type; outName? }`, `StatisticsQueryParameters = { statistics; whereClause?; groupBy?; orderBy? }`, `StatisticRecord = { group; statistics }`. `FeatureLayerHandle` += `queryStatistics(q)`.
- **Натив (QueryCodec):** `buildStatisticsQueryParameters` → `StatisticsQueryParameters(statisticDefinitions)` + whereClause + `groupByFieldNames`/`orderByFields` (get-only → `add*`/`addAll`). `StatisticDefinition(field, type, outName)`. `serializeStatisticRecord` → `{group, statistics}` (через `serializeAttributes`). Общий `buildOrderBy` вынесен (используется и в feature-query).
- **API-нюанс:** `StatisticType` — Kotlin `Maximum`/`Minimum`, **Swift `StatisticDefinition.StatisticType.maximum`/`.minimum`** (НЕ `.max`/`.min` — те у другого StatisticType-enum). `StatisticsQueryResult`: Swift `.statisticRecords()→AnySequence`, Kotlin `Iterable<StatisticRecord>`. `StatisticRecord.{group,statistics}: Map`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 3 — Identify на `<MapView>` ref ✅
- **TS:** `IdentifyResult = { layerName; features: Feature[] }`; `MapViewHandle = { identify(screenPoint:{x,y}, options?:{tolerance?,maxResults?}): Promise<IdentifyResult[]> }`. **`<MapView>` → `forwardRef`** + `useImperativeHandle` → делегирует в **нативную view-функцию** через ref на native-компонент (`nativeRef.current.identify(...)`). В `NativeMapViewProps` добавлен `ref?: Ref<unknown>` (иначе TS не пускает ref на `requireNativeView`-компонент).
- **Натив (view `AsyncFunction`):**
  - **Swift:** view-функция = **первый аргумент — view**, `async throws`-замыкание прямо: `AsyncFunction("identify") { view, screenPoint, options in try await view.identify(...) }`. `MapViewProxy` захвачен из `MapViewReader` в `model.proxy` (через `.onAppear { model.proxy = proxy }`, non-published var); `proxy.identifyLayers(screenPoint:CGPoint, tolerance:, maximumResultsPerLayer:)` (@MainActor async).
  - **Kotlin:** view-`AsyncFunction` возвращает `AsyncFunctionComponent` (НЕ Builder → **`Coroutine` нельзя**) → использую **`Promise` последним аргументом** + `scope.launch`: `view.identify(screenPoint, options, promise)`; `mapView.identifyLayers(ScreenCoordinate(x,y), tol, false, max)` (suspend `Result`) → `promise.resolve/reject`. `ScreenCoordinate` = typealias `DoubleXY(x,y)`.
  - `serializeIdentifyResult` (QueryCodec): `{layerName: layerContent.name, features: geoElements.filter(Feature).map(serializeFeature)}`. **SceneView identify — DEFER** (тот же паттерн, SceneViewProxy; v1 — только MapView).
- **Демо:** ref на MapView (тап по cities → `identify` → имя города) + ref на cities-FeatureLayer («Big cities» = `queryFeatureCount(POP>5M)`, «Avg pop» = `queryStatistics(average POP)`).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

---

## Итог раздела Query ✅
3 фазы, все верифицированы (TS / Android `:app:compileDebugKotlin` / iOS full `-scheme expoarcgisexample` — BUILD SUCCEEDED). **«Примени референции» = useRef:** все запросы — через **императивный ref** (forwardRef + useImperativeHandle), нативно — Expo **`AsyncFunction`** (Promise).
1. **Feature query** на `<FeatureLayer>` ref: `queryFeatures`/`queryFeatureCount`/`queryExtent` (`QueryParameters` + `SpatialRelationship` + сериализация `Feature`).
2. **Statistics query**: `queryStatistics` (`StatisticDefinition`/`StatisticType` + `StatisticRecord`).
3. **Identify** на `<MapView>` ref: `identify(screenPoint)` → `IdentifyResult[]` (view-`AsyncFunction`).
**Архитектурное:** `QueryCodec.swift`/`.kt` (buildQueryParameters / buildStatisticsQueryParameters / serializeFeature / serializeStatisticRecord / serializeIdentifyResult), переиспользует гео-кодек. Expo async: Swift `AsyncFunction{ async throws }`, Kotlin Class — `AsyncFunction(...) Coroutine{ suspend }` (`import …functions.Coroutine`), Kotlin View — `Promise`-аргумент (Coroutine не работает). **DEFER:** queryRelatedFeatures (нужен ArcGISFeature+relationship), displayFilterDefinition, temporal (timeExtent), SceneView identify, identify по raster/WMS/MapImage sublayers.

## 20. Раздел Edit features (план одобрен, 2 фазы) — правки через useRef

Объём: add/update/delete фичей на редактируемом feature-сервисе + persist (`applyEdits`). Те же `useRef`+`AsyncFunction` (как Query); правки идут на `FeatureLayerRef.table`. Геометрию — готовый `<GeometryEditor>`. Сверено по jar/swiftinterface.

### Фаза 1 — Add feature ✅
- **TS:** `FeatureLayerHandle` += `addFeature(attributes: Record<string,unknown>, geometry?: Geometry): Promise<number | null>` (новый objectId или null для не-service таблиц).
- **Натив:** `FeatureLayerRef.addFeature` → Swift `table.makeFeature()` / Kotlin `table.createFeature()` → `applyAttributes` (Swift `setAttributeValue(_:forKey:)`, Kotlin `feature.attributes[k]=v` mutable) + `feature.geometry = …` → Swift `table.add(f)` / Kotlin `addFeature(f).getOrThrow()` → `persistEdits()` (если `table is ServiceFeatureTable`: `applyEdits()` → `results.first.objectID`/`firstOrNull().objectId`; иначе null).
- **API-нюансы:** Swift create = **`makeFeature(attributes:geometry:)`** (НЕ createFeature); атрибуты через **`setAttributeValue(_:(any Sendable)?,forKey:)`** → JS-значения привожу к Sendable-скалярам (Bool/Int/Double/String; NSNumber/NSString сами не Sendable); add/update/delete = **`add(_:)/update(_:)/delete(_:)`** (НЕ addFeature). Kotlin = `createFeature()` + `addFeature/updateFeature/deleteFeature` + `attributes` (mutable map). `applyEdits()→[FeatureEditResult]`; `EditResult.objectID:Int`/`objectId:Long`. `applyAttributes` — в QueryCodec.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 2 — Update + Delete feature ✅
- **TS:** `FeatureLayerHandle` += `updateFeature(objectId: number, changes: { attributes?; geometry? }): Promise<void>` и `deleteFeature(objectId: number): Promise<void>`.
- **Натив:** приватный `featureByObjectId(id)` — `QueryParameters` с `objectIds=[id]` → `queryFeatures` → первая фича (Swift `Array(result.features()).first`, Kotlin `getOrThrow().firstOrNull()`). `updateFeature` → применить атрибуты (`applyAttributes`) + geometry → `table.update(f)`/`updateFeature(f)` → `persistEdits()`. `deleteFeature` → `table.delete(f)`/`deleteFeature(f)` → `persistEdits()`. objectId: Swift `Int`, Kotlin `Long` (Expo конвертит JS-number).
- **Демо (`example/App.tsx`):** тоггл «Edit layer» (`<FeatureLayer ref={editRef} url=Wildfire>` — публичный анонимно-редактируемый сервис) + «Add here» (тап-пин → `addFeature({}, point)` → запомнить objectId) / «Move here» (`updateFeature(id, {geometry: tappedPoint})`) / «Delete» (`deleteFeature(id)`).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

---

## Итог раздела Edit features ✅
2 фазы, все верифицированы (TS / Android `:app:compileDebugKotlin` / iOS full `-scheme expoarcgisexample` — BUILD SUCCEEDED). Правки — через тот же **`useRef`+`AsyncFunction`** (как Query): `<FeatureLayer>` ref += `addFeature`/`updateFeature`/`deleteFeature` (каждая делает локальную правку + `applyEdits` на ServiceFeatureTable). Геометрию рисуем готовым `<GeometryEditor>`.
**Архитектурное:** `applyAttributes` + edit-методы — в `QueryCodec`/`FeatureLayerRef` (переиспользуют `table` из Query-фазы и гео-кодек). **API-расхождения Swift↔Kotlin:** create — Swift `makeFeature(attributes:geometry:)` vs Kotlin `createFeature()`; mutate — Swift `setAttributeValue(_:(any Sendable)?,forKey:)` (JS→Sendable-скаляры) vs Kotlin `attributes[k]=v` (mutable); edit — Swift `add(_:)/update(_:)/delete(_:)` vs Kotlin `addFeature/updateFeature/deleteFeature`. **DEFER:** attachments (бинарные данные), feature forms (toolkit UI), batch/undo (`applyEdits`/`undoLocalEdits` отдельно), advanced (attribute rules, contingent values, related features, branch versioning, geodatabase transactions, offline sync, templates/subtypes).

## 21. Раздел Device location (план одобрен, 2 фазы)

Базовый display (§5) уже был; секция расширяет: **событие локации** + **симулированный источник**. Декларативно (event-проп + конфиг на `<MapView>`), НЕ useRef. Сверено по jar/swiftinterface.

### Фаза 1 — `onLocationChange` event + `wanderExtentFactor` ✅
- **TS:** `MapViewProps` += `onLocationChange?: (event:{ nativeEvent: LocationEventPayload }) => void`; `LocationEventPayload = { position:{latitude,longitude,z?}, horizontalAccuracy, verticalAccuracy, course, speed, timestamp }`. `LocationDisplay` += `wanderExtentFactor?`. (`onLocationChange` идёт через `{...props}` — `MapView.tsx` не трогал.)
- **Натив:** наблюдаю поток локации → emit `onLocationChange`. **Swift:** `locationDisplay.$location` — `AsyncStream<Location?>` → `.task { for await location in … { if let location { model.onLocationChange?(location) } } }` (как `$geometry` у editor); `serializeLocation(Location)→dict`. **Kotlin:** `mapView.locationDisplay.location` — `StateFlow<Location>` → `scope.launch{ collect{ location?.let{ onLocationChange(locationPayload(it)) } } }`; payload — `Record` (`LocationEventPayload`/`LocationPositionRecord`, как `TapEventPayload`). `wanderExtentFactor` — `Float` на обеих. `Location.{position:Point, horizontalAccuracy, verticalAccuracy, course, speed, timestamp}` (Swift `Date`→epoch-ms / Kotlin `Instant.toEpochMilli()`).
- **Нюанс:** Swift `LocationDisplay` НЕ имеет `showAccuracy`-Bool (только `accuracySymbol`) и использует `showsLocation` (не showLocation) → `showAccuracy` выкинул из конфига (паритет). Event-payload: Swift `EventDispatcher`-dict, Kotlin `EventDispatcher<Record>` (как onTap).
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 2 — SimulatedLocationDataSource (движение по маршруту) ✅
- **TS:** `LocationDisplay` += `source?: 'system' | { type:'simulated'; route: Geometry; speed? }` (route несёт `type:'polyline'` — парсится гео-кодеком).
- **Натив `setLocationDisplay`:** строю `LocationDataSource` из конфига и **свапаю `locationDisplay.dataSource`** (оба settable: Kotlin `setDataSource`, **Swift тоже `var dataSource { get set }`** — пересоздавать LocationDisplay НЕ нужно). Возврат null = оставить текущий; 'system' пока симулируется → новый `SystemLocationDataSource()`. Затем `stop()`+`start()` нового (Swift — через bump `locationVersion` → start-`.task(id:)` перезапускается).
  - **Симулированный источник из полилинии:** **Kotlin** `SimulatedLocationDataSource(Polyline, SimulationParameters(Instant.now(), speed, 0.0, 0.0))` — SDK сам интерполирует. **Swift** SimulatedLocationDataSource имеет ТОЛЬКО `init()` + `addSimulatedLocations([Location])` (НЕТ `setLocations(withPolyline:)`/route-init) → строю `Location(position:horizontalAccuracy:verticalAccuracy:speed:course:)` из вершин маршрута (`route.parts.flatMap{ $0.points }`). Лёгкая асимметрия: Kotlin плавно, Swift прыгает по вершинам (демо-маршрут даю с запасом точек).
- **Демо:** кнопка «Simulate» → `locationDisplay={{ source:{type:'simulated', route: ROUTE}, autoPanMode:'navigation' }}`; точка едет по короткому маршруту; `onLocationChange` пишет lat/lon в статус.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

---

## Итог раздела Device location ✅
2 фазы, все верифицированы (TS / Android `:app:compileDebugKotlin` / iOS full `-scheme expoarcgisexample` — BUILD SUCCEEDED). Декларативное расширение базового display (§5): `onLocationChange`-событие (поток локации) + `wanderExtentFactor` + `source` (system | simulated-по-маршруту).
**Архитектурное:** наблюдение потока — Swift `$location` AsyncStream (`.task`) / Kotlin `location` StateFlow (`scope.collect`); event-payload Swift dict / Kotlin Record (как onTap). Свап источника — `locationDisplay.dataSource =` (settable обе). **DEFER:** NMEA (внешний GPS), Indoors/IPS (BLE/Wi-Fi), Geotriggers, RouteTracker, кастомные символы локации, location-history-графика (app-level через `onLocationChange`).

## 22. Раздел Geocode and search (план одобрен, 2 фазы)

Объём: прямое/обратное геокодирование + suggest через `LocatorTask`. **Не привязано к слою** → namespace `geocoder` (как `geometryEngine`/`coordinateFormatter`) поверх World Geocoding Service. Нативно — Expo `AsyncFunction` в модуле-операций `ExpoArcgisGeometry`, с кэшем `LocatorTask`.

### Фаза 1 — geocode + reverseGeocode ✅
- **JS:** объект `geocoder` (`src/geocoder.ts`, экспортирован) — `geocode(text, params?)` / `reverseGeocode(point, params?)` → `GeocodeResult[]` (`{ label, location: PointGeometry|null, score, attributes }`). Параметры: `maxResults`/`countryCode`/`categories`/`preferredSearchLocation`/`maxDistance`/`locatorUrl` (дефолт World service).
- **Натив `GeocoderFunctions.swift`/`.kt`:** кэш `LocatorTask` по URL (Kotlin `ConcurrentHashMap`, Swift `NSLock`-класс `@unchecked Sendable`). `geocode`/`reverseGeocode` — Expo `AsyncFunction` в `ExpoArcgisGeometryModule` (Swift `async throws`, Kotlin `Coroutine` — добавил `import …functions.Coroutine` в geometry-модуль). `serializeGeocodeResult` (через гео-кодек `dictFromGeometry` + `serializeAttributes` из QueryCodec). WORLD = `geocode-api.arcgis.com/.../World/GeocodeServer` (нужен API-ключ — уже из `MapSettings`).
- **API-нюансы:** Swift `LocatorTask(url:URL)`, `geocode(forSearchText:using:)`/`reverseGeocode(forLocation:parameters:)` (`async throws`); **`GeocodeParameters.categories` get-only → `addCategories(_:)`** (как objectIDs/orderByFields); `GeocodeResult.displayLocation:Point?`. Kotlin `LocatorTask(String)`, `geocode(String, GeocodeParameters)`/`reverseGeocode(Point, ReverseGeocodeParameters)` (`Result`); `categories` — mutable list (`addAll`). Пакет `com.arcgismaps.tasks.geocode`.
- **Верификация:** TS ✅ · Android ✅ · iOS ✅.

### Фаза 2 — suggest (autocomplete) ✅
- **JS:** `geocoder.suggest(text, params?)` → `SuggestResult[]` (`{ label, isCollection }`). Параметры `SuggestParameters`: `maxResults`/`categories`/`preferredSearchLocation`/`locatorUrl`. Тип-декларация — в `ExpoArcgisGeometryModule.ts`.
- **Натив:** `suggest` в том же `GeocoderFunctions.swift`/`.kt` (новых файлов нет → pod install не нужен) — `locator.suggest(...)` → `serializeSuggestResult` (`{label, isCollection}`); `buildSuggestParameters`. Регистрация `AsyncFunction("suggest")` в обоих `ExpoArcgisGeometryModule`.
- **API-нюансы:** Swift `locator.suggest(forSearchText:parameters:SuggestParameters?)` → `[SuggestResult]` (`async throws`); `SuggestParameters.categories` тоже get-only → `addCategories(_:)`. Kotlin `locator.suggest(String, SuggestParameters)` → `Result<List<SuggestResult>>` (`getOrThrow()`); `categories` — mutable list. `SuggestResult.{label:String, isCollection:Bool}` (без координат — это лишь подсказка; реальные координаты = повторный `geocode(label)`).
- **Верификация:** TS ✅ · Android (`:expo-arcgis` + `:app:compileDebugKotlin`) ✅ · iOS (`ExpoArcgis` + `expoarcgisexample`) ✅.

### Демо (`example/App.tsx`)
2D-кнопки в общем ряду: **Find LA** (`geocoder.geocode('Los Angeles, CA')` → diamond-`SimpleMarkerSymbol` на `location` + статус `label`/`score`), **Reverse pin** (`geocoder.reverseGeocode({x,y})` от тапнутого пина → статус-адрес), **Suggest** (`geocoder.suggest('Coffee')` → первая подсказка в статусе). Новый стейт `geocoded: Geometry|null`, графика в общем `GraphicsOverlay`.

### Итог раздела
Геокодирование как **namespace `geocoder`** (`geocode`/`reverseGeocode`/`suggest`), асинхронно через кэшированный `LocatorTask` поверх World Geocoding Service (API-ключ из `MapSettings`). Все 3 операции — Expo `AsyncFunction` в `ExpoArcgisGeometry`. **DEFER (вне v1):** offline-локатор (`.loc`), structured-address geocode (`forSearchValues:`), round-trip `SuggestResult`→geocode нативным объектом (сейчас по строке `label`), `resultAttributeNames`/`outputSpatialReference`-тюнинг, toolkit SearchView.

## 23. Раздел Route and directions (план одобрен, 2 фазы)

Объём: маршрут между точками (stops) с метриками + пошаговые указания через `RouteTask`. **Не привязано к слою/виду** → namespace `router` (как `geocoder`) поверх World Route Service. Нативно — Expo `AsyncFunction` в `ExpoArcgisGeometry`, с кэшем `RouteTask`. Пакет `com.arcgismaps.tasks.networkanalysis`.

### Фаза 1 — R1: solveRoute (геометрия + метрики + travelMode) ✅
- **JS:** объект `router` (`src/router.ts`, экспортирован) — `solveRoute(stops: RouteStop[], params?)` → `RouteResult` (`{ routes: Route[], messages }`). `RouteStop = { point: PointGeometry; name? }`; `Route = { geometry: PolylineGeometry|null, name, totalLength (м), travelTime (мин), totalTime (мин) }`. Параметры `RouteParameters`: `travelMode` (по имени)/`returnRoutes`/`returnStops`/`findBestSequence`/`routeServiceUrl`. Добавил alias `PolylineGeometry`.
- **Натив `RouterFunctions.swift`/`.kt`:** кэш `RouteTask` по URL (зеркало `GeocoderFunctions`). `solveRoute` → `makeDefaultParameters()`/`createDefaultParameters().getOrThrow()` (грузит таск) → `Stop(point)` (+`name`) → `setStops(...)` → опции + travelMode по имени из `info.travelModes` → `solveRoute(...)` → `serializeRoute`. WORLD = `route-api.arcgis.com/.../World/Route/NAServer/Route_World` (API-ключ из `MapSettings`).
- **API-нюансы:** Swift `RouteTask(url:URL)`, `makeDefaultParameters()`/`solveRoute(using:)` (`async throws`), `info: RouteTaskInfo` (property, struct), `Route.geometry: Polyline?`, `totalLength: Measurement<UnitLength>` → `.converted(to:.meters).value`, тогглы `returnsRoutes`/`returnsStops`/`findsBestSequence` (с «-s»). Kotlin `RouteTask(String)`, `createDefaultParameters()`/`solveRoute()` (`Result`), **`getRouteTaskInfo()` — функция-геттер, НЕ property** (в отличие от `RouteParameters`/`Route`, чьи property резолвятся), **`Route.routeGeometry: Polyline?`** (nullable + другое имя), `totalLength: Double` (метры), тогглы `returnRoutes`/`returnStops`/`findBestSequence` (без «-s»). `travelTime`/`totalTime` — минуты обе платформы.
- **Демо:** кнопка «Route» (Santa Monica → Downtown LA) → polyline-`Graphic` (`simple-line`) + статус `X.X km · Y min`. Стейт `routeGeom: Geometry|null`.
- **Верификация:** TS ✅ · Android (`:expo-arcgis`) ✅ · iOS (`ExpoArcgis` pod, после `pod install`) ✅.

### Фаза 2 — R2: directions (turn-by-turn) ✅
- **JS:** `DirectionManeuver = { text; length (м); duration (мин); geometry: Geometry|null }`; добавил `directions: DirectionManeuver[]` в `Route` и `returnDirections?`/`directionsLanguage?` в `RouteParameters`.
- **Натив:** `returnsDirections`/`returnDirections` = `params ?? true` (+ `directionsLanguage`); `serializeRoute` расширен `directions: directionManeuvers.map(serializeManeuver)`. `serializeManeuver` — **Swift `m.text` + `m.length.converted(to:.meters).value`** vs **Kotlin `m.directionText` + `m.length` (Double)**; `duration` минуты; `geometry: Geometry?` (nullable обе).
- **Демо:** статус дополнен первым маневром + числом шагов (`directions[0].text` · `directions.length`).
- **Верификация:** TS ✅ · Android (`:expo-arcgis` + `:app:compileDebugKotlin`) ✅ · iOS (`ExpoArcgis` + `expoarcgisexample`) ✅.

### Итог раздела
Маршрутизация как **namespace `router`** (`solveRoute`) поверх кэшированного `RouteTask` (World Route Service, API-ключ из `MapSettings`). Async `AsyncFunction` в `ExpoArcgisGeometry`. **DEFER (вне v1):** offline `RouteTask` (локальный network dataset/`.geodatabase`), barriers, `setStops(fromFeaturesIn:)`, маршрут из PortalItem/FeatureCollection, навигация (`RouteTracker`/`refreshRoute`), атрибуты стопа (curbApproach/timeWindows/bearing), `accumulateAttributeNames`, кастомные `directionsStyle`/`directionsDistanceUnits`, мульти-маршрут сверх тогглов.

## 24. Раздел Spatial analysis (план одобрен, 3 фазы)

Объём (по решению пользователя — обе части темы): **(1) GPU-визуальный анализ на SceneView** (viewshed + line-of-sight, декларативно через `<AnalysisOverlay>`) + **(2) GeoprocessingTask** (серверный геопроцессинг, namespace `geoprocessor`). GeometryEngine (клиентский анализ) уже был (G2).

### Фаза 1 — SA1: AnalysisOverlay + Viewshed ✅
- **JS:** `<AnalysisOverlay>` (ребёнок `<SceneView>`) + `<Viewshed>` (зеркало `GraphicsOverlay`/`Graphic`). `ViewshedProps` (location/heading/pitch/horizontalAngle/verticalAngle/min|maxDistance/frustumOutlineVisible). `contexts.ts`: `AnalysisOverlayHost`+`AnalysisOverlayContext`+`useAnalysisOverlay`, `GeoViewHost` расширен (MapView — no-op, анализы только 3D). `SceneView.tsx`: стейт `analysisOverlays` + нативный проп.
- **Натив `AnalysisOverlayRef.swift`/`.kt`:** `AnalysisOverlayRef` (над `AnalysisOverlay`) + abstract `AnalysisRef` base + `ViewshedRef` (над `ExploratoryLocationViewshed`). Пакет Kotlin `com.arcgismaps.analysis.interactive.*`, `AnalysisOverlay` — `mapping.view`. `sceneView.analysisOverlays` (Kotlin) / `SceneView(analysisOverlays:)` (SwiftUI). `AnalysisOverlay.analyses` мутабелен (как `graphics`).
- **API:** Swift `ExploratoryLocationViewshed(location:heading:pitch:horizontalAngle:verticalAngle:minDistance:maxDistance:)` (frustumOutline**Is**Visible), Kotlin ctor `(Point, heading, pitch, hAngle, vAngle, Double?, Double?)` (frustumOutlineVisible). Все свойства settable.
- **Демо:** `<Viewshed>` над террейном 3D-сцены + тоггл. **Верификация:** TS ✅ · Android ✅ · iOS (после `pod install`) ✅.

### Фаза 2 — SA2: LineOfSight + targetVisibility ✅
- **JS:** `<LineOfSight>` (observer/target + `onTargetVisibilityChange`). `TargetVisibility = 'visible'|'obstructed'|'unknown'`. `AnalysisRef` сделан дженериком по событиям; `LineOfSightRef extends AnalysisRef<LineOfSightEvents>`. Подписка через `ref.addListener` (эталон GeometryEditor).
- **Натив:** `LineOfSightRef` (над `ExploratoryLocationLineOfSight(observerLocation:targetLocation:)`) в `AnalysisOverlayRef.*`; подписка на `targetVisibility` (Swift `$targetVisibility` AsyncStream / Kotlin StateFlow) → `emit("onTargetVisibilityChange")`. Swift enum `.visible/.obstructed/.unknown`; Kotlin sealed `ExploratoryLineOfSightTargetVisibility.{Visible/Obstructed/Unknown}`.
- **Демо:** `<LineOfSight>` поперёк террейна → видимость в статус. **Верификация:** TS ✅ · Android ✅ · iOS (без pod install) ✅.

### Фаза 3 — SA3: GeoprocessingTask (`geoprocessor.execute`) ✅
- **JS:** namespace `geoprocessor` — `execute(serviceUrl, inputs): Promise<GeoprocessingResult>`. `GeoprocessingInput` (union `string`/`double`/`long`/`boolean`/`linearUnit{value,unit?}`/`features{geometries}`), `GeoprocessingResult = { outputs: Record<string, unknown> }` (скаляр→value, features→`Feature[]`).
- **Натив `GeoprocessingFunctions.swift`/`.kt`:** кэш `GeoprocessingTask` по URL. `makeDefaultParameters()`/`createDefaultParameters().getOrThrow()` (грузит таск, ставит execution type) → `buildParameter` каждого входа → `setInputValue`(Swift)/`inputs[k]=`(Kotlin) → `makeJob`/`createJob` → `start()` → **Swift `try await job.result.get()`** (`typealias Output = GeoprocessingResult`) / **Kotlin `job.result().getOrThrow()`** → `serializeOutputs`. Типы параметров в Kotlin под-пакете `...geoprocessing.geoprocessingparameters.*`. features-вход: `FeatureCollectionTable(geoElements:[Graphic(geometry:)], fields:[])` → `GeoprocessingFeatures`. features-выход: `canFetchOutputFeatures`→`fetchOutputFeatures()`→`.features` (**nullable** в Kotlin) → `serializeFeature` (Kotlin `FeatureSet : Iterable<Feature>`; Swift `.features()`). linearUnit — переиспользован существующий `linearUnit(id)` (GeometryCodec). `GeoprocessingLong` = Int32(Swift)/int(Kotlin).
- **Демо:** Esri Viewshed GP-сервис (`sampleserver6.../ESRI_Elevation_World/GPServer/Viewshed`, публичный) — point-features + linearUnit(мили) → полигоны видимости рисуем `simple-fill`. Кнопка «Viewshed GP». **Верификация:** TS ✅ · Android (`:expo-arcgis` + `:app`) ✅ · iOS (`ExpoArcgis` + `expoarcgisexample`, после pod install) ✅.

### Итог раздела
Визуальный анализ — декларативно (`<AnalysisOverlay>`/`<Viewshed>`/`<LineOfSight>` на SceneView, зеркало GraphicsOverlay/Graphic). Геопроцессинг — namespace `geoprocessor.execute` поверх кэшированного `GeoprocessingTask` (типизированные вход/выход, async job). **DEFER (вне v1):** GeoElement-анализы / camera-ctor вьюшеда / distance-measurement; высокоточные raster-функции (`ViewshedFunction`/field-функции); per-instance/static цвета анализов; GP raster-выход (`mapImageLayer`), прогресс/сообщения job'а, параметры date/dataFile/multiValue, интроспекция `GeoprocessingTaskInfo`.

## 25. Раздел Utility Network (план одобрен, 4 фазы — полный объём + токен-auth + живое демо)

Самый продвинутый раздел: инженерные сети (`com.arcgismaps.utilitynetworks.*`). По решению пользователя — **обе части + живое демо** (значит и токен-auth). Доки — обзорные, без кода → всё по jar/swiftinterface.

### Фаза 1 — UN1: токен-аутентификация ✅
- **JS:** экспортируемая `setTokenCredential(serviceUrl, username, password): Promise<void>` (`src/auth.ts`). **Натив (main-модуль):** `AsyncFunction("setTokenCredential")` — Swift `TokenCredential.credential(for:username:password:)` + `ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(cred, for:url)`; Kotlin `TokenCredential.create(url, username, password).getOrThrow()` + `arcGISCredentialStore.add(cred)`. Нужно для UN-сервисов (логин, не API-ключ). **Верификация:** TS/Android/iOS ✅.

### Фаза 2 — UN2: `<UtilityNetwork>` load + trace ✅
- **JS:** `<UtilityNetwork serviceGeodatabaseUrl>` (forwardRef ребёнок `<Map>`, как `<FeatureLayer>`): `load(map)` на mount; imperative `trace(traceType, descriptors)`. Типы `UtilityTraceType`/`UtilityElementDescriptor`/`UtilityElementInfo`/`UtilityTraceResult`/`UtilityNetworkHandle`.
- **Натив (`UtilityNetworkRef.swift/.kt`, новый):** `load(mapRef)` → `ServiceGeodatabase(url)` → `.load()` → `UtilityNetwork(serviceGeodatabase:)` (**единственный ctor**) → `.load()` → `map.addUtilityNetwork`/`map.utilityNetworks.add`. `trace` → descriptors через `definition.networkSource(named:)?.assetGroup(named:)?.assetType(named:)` + `makeElement(assetType:globalID:)` / Kotlin `createElementOrNull(assetType, Guid.createOrNull(...), null)` → `UtilityTraceParameters(traceType:startingLocations:)` → `network.trace(using:)` → `UtilityElementTraceResult.elements`. **API-нюансы:** TraceType — Swift nested enum `UtilityTraceParameters.TraceType.{connected,…}` vs Kotlin sealed `UtilityTraceType.{Connected,…}`; Kotlin lookup-методы `getNetworkSource/getAssetGroup/getAssetType` **nullable**; globalId — Swift `UUID`, Kotlin value-class `Guid` (`Guid.createOrNull(str)`, `element.globalId.toString()`). Новый Swift-файл → `pod install`.
- **Демо:** «Load UN» → `setTokenCredential(Naperville, viewer01/…)` → `<UtilityNetwork>` → имя сети в статус. **Верификация:** TS/Android/iOS ✅.

### Фаза 3 — UN3: display layers + traceFromQuery + selection ✅
- `load()` дополнительно создаёт `FeatureLayer` из `serviceGeodatabase.connectedTables` (Swift `FeatureLayer(featureTable:)` / Kotlin `FeatureLayer.createWithFeatureTable`) и кладёт в `map`, кэшируя по `table.tableName`. `traceFromQuery(tableName, whereClause, traceType)` — query реального стартового фичера (`QueryParameters` whereClause/maxFeatures) → `makeElement(arcGISFeature:)`/`createElementOrNull(feature,null)` → trace → **выделение результата** (группировка по `networkSource.name` → `FeatureLayer.selectFeatures(using:/query, mode:.new/SelectionMode.New)`). Демо: кнопки «Connected»/«Downstream». **Верификация:** TS/Android/iOS ✅.

### Фаза 4 — UN4: named trace configurations + associations ✅
- `queryNamedTraceConfigurations()` → `{name, globalId}[]` (кэш по globalId; Swift `queryNamedTraceConfigurations()` дефолт-параметры / Kotlin `queryNamedTraceConfigurations(UtilityNamedTraceConfigurationQueryParameters())`). `traceWithConfiguration(globalId, tableName, whereClause)` → `UtilityTraceParameters(namedTraceConfiguration:startingLocations:)`. `associations(tableName, whereClause)` → `{count, kinds}` (Swift `network.associations(for:element)` + `UtilityAssociation.Kind` / Kotlin `getAssociations(element, null)` + sealed `UtilityAssociationType`). Демо: «Configs»/«Assoc». **Верификация:** TS · Android (`:expo-arcgis`+`:app`) · iOS (`ExpoArcgis`+`expoarcgisexample`) ✅.

### Итог раздела
Utility Network как декларативный `<UtilityNetwork>` (forwardRef ребёнок `<Map>`) + токен-auth (`setTokenCredential`). Сборочно верифицировано на 3 таргетах; **живой прогон трассы — на устройстве пользователем** (нужна сеть + sample-логин). **DEFER:** offline UN / subnetwork management / редактирование ассоциаций / ручной `UtilityTraceConfiguration` (берём только named) / terminal-configuration / validate-topology / tap→native-feature (используем native-query вместо identify-фичера).

## 26. Раздел Offline maps, scenes and data (план одобрен, 4 фазы — полный объём)

Работа без сети. По решению пользователя — полный объём. Все операции — async Job’ы, пишущие файлы на диск (download-каталог нативно: Swift `FileManager` documents, Kotlin `appContext.reactContext?.filesDir`, очистка перед загрузкой). Namespace `offline` в ops-модуле `ExpoArcgisGeometry` (как `geoprocessor`) — паттерн `Task → makeDefault…Parameters → make…Job(downloadDir/File) → start()+await result`.

### Фаза 1 — OFF1: generateOfflineMap + показ `.mmpk` ✅
- `offline.generateOfflineMap(portalItemId, area, name)` → `OfflineMapTask(portalItem)` → `makeDefaultGenerateOfflineMapParameters(area)` → `makeGenerateOfflineMapJob(params, downloadDir)` → путь. **Показ:** новый проп `<Map mobileMapPackagePath>` — `MapRef.map` стал **изменяемым** + callback `onMapChanged` (вью переподхватывает карту после async-загрузки `MobileMapPackage(fileURL/path).maps.first`); `ExpoArcgisMapView.setMap` ставит `ref.onMapChanged`. Новый Swift-файл (`OfflineFunctions.swift`) → `pod install`. **Верификация:** TS/Android/iOS ✅.

### Фаза 2 — OFF2: preplanned offline maps ✅
- `offline.preplannedMapAreas(portalItemId)` → `{title, index}[]` (**Swift `task.preplannedMapAreas` — `get async throws` property → `try await`**; Kotlin `getPreplannedMapAreas()` suspend; `area.load()` для title). `downloadPreplannedOfflineMap(portalItemId, index, name)` → `makeDefaultDownloadPreplannedOfflineMapParameters(area)` → `makeDownloadPreplannedOfflineMapJob(params, dir)`. **Верификация:** TS/Android/iOS ✅.

### Фаза 3 — OFF3: geodatabase generate + sync ✅
- `generateGeodatabase(featureServiceUrl, extent, name)` → `GeodatabaseSyncTask(url)` → `makeDefaultGenerateGeodatabaseParameters(extent)` → `makeGenerateGeodatabaseJob(params, downloadFileURL=<name>.geodatabase)` → `Geodatabase{fileURL/path, featureTables}`. `syncGeodatabase(path, url)` → `Geodatabase(fileURL/path).load()` → `makeSyncGeodatabaseJob(syncDirection:.bidirectional/SyncDirection.Bidirectional, rollbackOnFailure, geodatabase)`. **Верификация:** TS/Android/iOS ✅.

### Фаза 4 — OFF4: tile + vector-tile export ✅
- `exportTileCache(tileServiceUrl, area, name)` → `ExportTileCacheTask(url)` → `makeDefaultExportTileCacheParameters(area)` / Kotlin `createDefaultExportTileCacheParameters(area, 0.0, 0.0)` → `makeExportTileCacheJob(params, fileURL=<name>.tpkx)` → путь. `exportVectorTiles(...)` → `ExportVectorTilesTask(url)` (Kotlin пакет **`com.arcgismaps.tasks.exportvectortiles`**) → `makeDefaultExportVectorTilesParameters(area)` / Kotlin `createDefaultExportVectorTilesParameters(area, 0.0)` → `makeExportVectorTilesJob(params, fileURL=<name>.vtpk)`. **Верификация:** TS · Android (`:expo-arcgis`+`:app`) · iOS (`ExpoArcgis`+`expoarcgisexample`) ✅.

### Итог раздела
Namespace `offline` (`generateOfflineMap`/`preplannedMapAreas`/`downloadPreplannedOfflineMap`/`generateGeodatabase`/`syncGeodatabase`/`exportTileCache`/`exportVectorTiles`) + декларативный показ `.mmpk` через `<Map mobileMapPackagePath>`. Демо-кнопки в 2D-ряду: Take offline / Preplanned / Geodatabase / Export tiles. **Сборочно верифицировано; реальная загрузка/sync — на устройстве** (сеть + offline-enabled/sync/exportTiles сервисы; размер tile-выгрузки — мелкий extent). **DEFER:** MobileScenePackage/.mspk, offline-сцены, `GenerateOfflineMapParameterOverrides`, `OfflineMapSyncTask`/scheduled-updates, estimate-size, прогресс-события job’ов, offline-локаторы/маршруты.

## 27. Programming-patterns апгрейды (план одобрен, 2 фазы) — «ознакомься, подчерпни»

Пользователь дал doc «Programming patterns» («ознакомься может что подчерпнёшь»). Код уже следует паттернам (GeoView-модель, async/await, Streamed/StateFlow-события, `CancellationError`, Loadable load+error). Сверка по факту выявила 2 пробела → пользователь выбрал «оба».

### Фаза 1 — PP1: `retryLoad` (Loadable resilience) ✅
- `<MapView>`/`<SceneView>` ref-метод `retryLoad()` (Loadable — устойчивость к сетевым сбоям): Swift `map/scene.retryLoad() async throws` + переэмит `onMapLoaded`/`onSceneLoaded`(error); Kotlin `retryLoad(): Result` (view AsyncFunction → **Promise-паттерн**, т.к. view-AsyncFunction не поддерживает Coroutine). `<SceneView>` стал **forwardRef** (как MapView) для отдачи ref. Демо: кнопки «Retry load» (2D+3D). **Верификация:** TS/Android/iOS ✅.

### Фаза 2 — PP2: `JobRef` (прогресс + отмена) ✅
- Generic `JobRef<R>` (`JobRef.swift`/`.kt`, новый) — SharedObject поверх базового `Job` + тип-стёртое замыкание `awaitResult`. `result()` → ставит наблюдение прогресса (**Swift `job.progress: Foundation.Progress` через KVO `observe(\.fractionCompleted)` → `Int(frac*100)`** vs **Kotlin `job.progress: StateFlow<Int>` collect**) → `job.start()` → `awaitResult()`. `cancel()` → `job.cancel()` (Swift async / Kotlin suspend). Событие `onProgress`. `Class(JobRef)` **без Constructor** (только возвращается из функций — Expo это допускает). `offline.generateOfflineMap` теперь возвращает `Promise<JobRef<OfflineMapResult>>`: `const job = await offline.generateOfflineMap(...); job.addListener('onProgress', …); const {path} = await job.result(); /* job.cancel() */`. Демо: «Take offline» показывает `%` + кнопка «Cancel». **Верификация:** TS · Android (`:expo-arcgis`+`:app`) · iOS (`ExpoArcgis`+`expoarcgisexample`) ✅.

### Итог
Перенял из «programming patterns»: Loadable `retryLoad` + Tasks/Jobs `progress`+`cancel` (через generic `JobRef`). Остальные offline-функции/geoprocessor могут принять JobRef идентично (DEFER). Сборочно верифицировано на 3 таргетах.

## 28. Раздел Real-time (dynamic entities) — план одобрен, 3 фазы (полный объём)

Живые движущиеся объекты из real-time источников. `DynamicEntityLayer` — это `Layer`, источник `DynamicEntityDataSource`. Ложится в layer-паттерн: `DynamicEntityLayerRef : LayerRef`, декларативный `<DynamicEntityLayer>` — ребёнок `<Map>` (как `<FeatureLayer>`, forwardRef + событие + handle). Пакет Kotlin `com.arcgismaps.realtime.*`.

### Фаза 1 — RT1: `<DynamicEntityLayer streamServiceUrl>` (core) ✅
- `DynamicEntityLayerRef.swift`/`.kt` (новый): `layer = DynamicEntityLayer(ArcGISStreamService(url))`; подписка на `dataSource.connectionStatus` (Swift `$connectionStatus` AsyncStream в `Task` / Kotlin `StateFlow.collect` в scope) → `emit("onConnectionStatusChange", {status})`. `ConnectionStatus` — Swift enum / Kotlin sealed. `trackDisplayProperties` (`maximumObservations`; **Swift `showsPreviousObservations` vs Kotlin `showPreviousObservations`**). **`LayerRef` стал generic по событиям** (`LayerRef<TEvents>`, как `AnalysisRef`); `addLayer(LayerRef<any>)`. JS `<DynamicEntityLayer>` forwardRef (колбэк отделён от нативных props → wired через `addListener`). Демо: тоггл «Real-time» (SandyRTGIS stream). **Верификация:** TS/Android/iOS ✅.

### Фаза 2 — RT2: query dynamic entities ✅
- ref-метод `queryDynamicEntities()` → `{count, entities:[{attributes, geometry}]}` через `dataSource.queryDynamicEntities(DynamicEntityQueryParameters())` (Swift `result.entities()` Sequence / Kotlin `DynamicEntityQueryResult : Iterable`). Демо: «Query entities». **Верификация:** TS/Android/iOS ✅.

### Фаза 3 — RT3: CustomDynamicEntityDataSource (push своих observations) ✅
- `<DynamicEntityLayer customSource={{entityIdField, fields}}>` + ref `pushObservation(attributes, geometry)`. Натив строит `CustomDynamicEntityDataSource` через feed: **Swift конкретный `CustomDynamicEntityFeed` (`PushFeed`, `typealias Events = AsyncStream<CustomDynamicEntityFeedEvent>` + continuation; `push` → `.newObservation(geometry:attributes:)`); `CustomDynamicEntityDataSource(info:){ feed }`.** **Kotlin анонимный `EntityFeedProvider` (`val feed = MutableSharedFlow.asSharedFlow()`, suspend `onLoad/onConnect/onDisconnect`); push → `flow.tryEmit(FeedEvent.NewObservation(geom, attrs))`.** `DynamicEntityDataSourceInfo(entityIdField, fields)`; `Field` — **Swift `ArcGIS.Field(type:name:alias:)`** (namespace обязателен — Expo тоже даёт `@Field`), Kotlin `Field(FieldType, name, alias, len, domain, ed, null)`. Атрибуты: **Swift нельзя кастить `Any as? any Sendable`** (marker) → маппер `String`/`NSNumber.doubleValue`/`String(describing:)`. Демо: «Custom RT» + «Push point» (движущийся объект). **Верификация:** TS · Android (`:expo-arcgis`+`:app`) · iOS (`ExpoArcgis`+`expoarcgisexample`) ✅.

### Итог раздела
`<DynamicEntityLayer>` (stream-сервис или custom feed) + connectionStatus-событие + trackDisplay + queryDynamicEntities + pushObservation. Сборочно верифицировано; живой поток (сеть + stream-сервис) — на устройстве. **DEFER:** popups, `ArcGISStreamServiceFilter`, purge/reconnection-тюнинг, observation-history, `onDynamicEntityChanged`-события, pull-режим (periodic refresh).

## 29. Починка Security & Authentication (план одобрен, 2 фазы)

Старая авторизация (`setTokenCredential(serviceUrl, username, password)` → ручное добавление токена в `arcGISCredentialStore` ДО загрузки) была хрупкой. Туториал рекомендует `ArcGISAuthenticationChallengeHandler` (реактивно). Пользователь: «делай первый 2 пункта» (token-handler + OAuth).

### Фаза 1 — AUTH1: challenge-handler для токенов ✅
- `AuthChallengeHandler.swift`/`.kt` (новый) — синглтон `ArcGISAuthenticationChallengeHandler` с опциональным логином. `handle(challenge)`: **Swift `TokenCredential.credential(for: challenge, username:, password:)`** (overload от challenge!) / **Kotlin `TokenCredential.create(challenge.requestUrl, …)`** → `Disposition.continueWithCredential` / `ArcGISAuthenticationChallengeResponse.ContinueWithCredential` (иначе `continueWithoutCredential`/`ContinueAndFail`). Ставится в `OnCreate`: `authenticationManager.arcGISAuthenticationChallengeHandler = handler`.
- `setTokenCredential(username, password)` — **убран serviceUrl** (sync `Function`, хендлер берёт URL из challenge). `signOut()` — очистка логина + `arcGISCredentialStore.removeAll()`. Демо: UN-логин без URL.
- **Верификация:** TS/Android/iOS ✅.

### Фаза 2 — AUTH2: OAuth user sign-in ✅
- `signInWithOAuth(portalUrl, clientId, redirectUrl, openAuthSession?)`. **iOS:** натив `OAuthUserCredential.credential(for: OAuthUserConfiguration(portalURL:clientID:redirectURL:))` — SDK сам презентует `ASWebAuthenticationSession` → `arcGISCredentialStore.add(cred)`. **Android:** `oauthStart` → `OAuthUserCredential.create(config){ signIn -> }` (suspend; `OAuthController` через `CompletableDeferred` отдаёт `signIn.authorizeUrl`) → JS открывает браузер → `oauthComplete(redirect)` → `signIn.complete(redirect)` → cred в store.
- **АРХИТЕКТУРНОЕ решение пользователя:** браузер — **проблема потребителя, не модуля**. `signInWithOAuth` принимает callback `openAuthSession: (authorizeUrl, redirectUrl) => Promise<string|null>`; модуль **БЕЗ зависимости от браузера** (нет expo-web-browser). Демо передаёт callback через `Linking` (встроенный; в проде — expo-web-browser/expo-auth-session). iOS callback не нужен (auto-present).
- **Верификация:** TS · Android (`:expo-arcgis`+`:app`) · iOS (`ExpoArcgis`+`expoarcgisexample`) ✅.

### Build-infra урок
Добавление НОВОГО пода (expo-web-browser) в example + конкурентный `pod install`/`clean` за-churn-или iOS-workspace (повреждённый `Pods.xcodeproj`, пропавшие per-pod схемы, битые module-map'ы Swift-подов в Expo-precompiled). Лечение: развязать модуль от браузер-зависимости (callback) → убрать expo-web-browser отовсюду → `pod install` регенерит pod-набор обратно в known-good. **Также:** `plugin/build` (config-plugin) — НЕтрекаемый build-артефакт; `npm install`/prepare его чистит, а инкрементальный `tsbuildinfo` потом пропускает эмит → перед full-app-сборкой `rm plugin/tsconfig.tsbuildinfo && npm run build:plugin`.

### Итог раздела
Реактивный token-auth (challenge-handler) + OAuth-вход (iOS auto-present / Android callback-based, модуль без браузер-зависимости) + `signOut`. Сборочно верифицировано; живой вход — на устройстве (token: sample-логин; OAuth: зарегистрированное приложение + redirect). **DEFER:** per-service креды, persistent store, OAuth через сам challenge-handler, IAP/PKI/app-login, custom refresh, server-revoke.

---

# Roadmap (бэклог DEFER → фазы)

Всё in-scope по §1–29 сделано и собрано на 3 таргетах. Ниже — отложенное, оформленное в фазы, приоритезированное по ценности/риску. Метод тот же: surf API по swiftinterface/jar → 1:1 в декларатив → демо → верификация TS/Android/iOS → handoff + память + коммит на фазу. Эффорт: **S** (1–2 файла), **M** (новый ref/namespace), **L** (новая архитектура/большой натив).

## Приоритет A — быстрые / консистентность (низкий риск)
- **A1 — JobRef везде ✅ ГОТОВО (коммит ниже).** Прогресс/отмена для ВСЕХ offline-функций (`downloadPreplannedOfflineMap`/`generateGeodatabase`/`syncGeodatabase`/`exportTileCache`/`exportVectorTiles`) + `geoprocessor.execute`. Все теперь возвращают `Promise<JobRef<R>>` (паттерн PP2: free-func создаёт job + `JobRef(job){ awaitResult }`, не запускает/не ждёт сам). Kotlin-функции получили `appContext`-параметр (для `JobRef`-конструктора). Демо: `const job = await offline.X(...); await job.result()`. **Верификация:** TS/Android/iOS ✅.
- **A2 — SceneView identify ✅ ГОТОВО.** Зеркало `MapView.identify` (Q3) для 3D: Swift `SceneViewProxy.identifyLayers(screenPoint:tolerance:maximumResultsPerLayer:)` (proxy ловится из `SceneViewReader` через `model.proxy`, как у MapView) / Kotlin `sceneView.identifyLayers(ScreenCoordinate, tolerance, false, maxResults)` (Promise-паттерн на View). `SceneViewHandle.identify`; демо — identify по тапу в 3D. Переиспользует `serializeIdentifyResult`. **Верификация:** TS/Android/iOS ✅.
- **A3 — GeometryEditor: выбор tool ✅ ГОТОВО.** Проп `<GeometryEditor tool>`: `vertex`(дефолт)/`freehand`/`reticleVertex`/`arrow`/`ellipse`/`rectangle`/`triangle`. `editor.tool =` (settable): Swift `VertexTool()`/`FreehandTool()`/`ReticleVertexTool()`/`ShapeTool(kind: .arrow)` (вложенный enum `ShapeTool.Kind`); Kotlin `…(ShapeToolType.Arrow)`. `Function("setTool")`; компонент ставит tool перед `start`. Демо: полигон `tool="freehand"`. **DEFER (в рамках A3):** доп. engine-операции (reshape/extend/cut-advanced) и полный список юнитов — отдельно при необходимости. **Верификация:** TS/Android/iOS ✅. **Приоритет A завершён (A1+A2+A3).**

## Приоритет B — крупные возможности (нужна архитектура / большой натив)
- **B1 — WFS + OGC API Features ✅ ГОТОВО (GeoPackage → DEFER).** Открытие: **WFS/OGC создают `FeatureLayer` над таблицей СИНХРОННО** (`WFSFeatureTable(url:tableName:)`/`OGCFeatureCollectionTable(url:collectionID:)` + `featureRequestMode = .onInteractionCache` → auto-populate при дисплее) → **вписались в существующий sync `createLayerComponent`-паттерн без новой архитектуры**. `<WfsLayer url tableName>` / `<OgcFeatureLayer url collectionId>` (рефы `WfsLayerRef`/`OgcFeatureLayerRef : LayerRef`). **Гоча:** Kotlin `OgcFeatureCollectionTable` + `WfsFeatureTable` — оба в **`com.arcgismaps.data`** (НЕ `com.arcgismaps.ogc`). **Верификация:** TS/Android/iOS ✅. **DEFER:** **GeoPackage** (`GeoPackage(path).load()` async → выбрать table → `FeatureLayer` — требует mutable-layer-swap инфраструктуры, как mmpk) + Geodatabase-слой. **Приоритет B завершён (B1 WFS/OGC + B2 offline-сцены + B3 offline-sync).**
- **B2 — Offline-сцены / MobileScenePackage ✅ ГОТОВО.** `<Scene mobileScenePackagePath>` — точное зеркало OFF1: `SceneRef.scene` стал **mutable** (`private(set) var` / `var … private set`) + callback `onSceneChanged`; `loadMobileScenePackage(path)` грузит `MobileScenePackage(fileURL/path).load() → scenes.first` async и свапает; `ExpoArcgisSceneView.setScene` wирует `onSceneChanged` (iOS `model.setScene` / Kotlin `applyScene`). `SceneProps.mobileScenePackagePath`. Демо-ветки нет (нужен реальный `.mspk` на устройстве) — API экспортирован + сборочно верифицирован. **Верификация:** TS/Android/iOS ✅.
- **B3 — Offline-sync ✅ ГОТОВО (флагман).** `offline.syncOfflineMap(mobileMapPackagePath)` → `JobRef<{synced}>`: открыть `.mmpk` (`MobileMapPackage(path).load().maps.first`) → `OfflineMapSyncTask(map)` → `makeDefault/createDefaultOfflineMapSyncParameters` → **Swift `makeSyncOfflineMapJob(parameters:)`** / **Kotlin `createOfflineMapSyncJob(params)`** (пакет `tasks.offlinemaptask`) → `JobRef`. Демо: кнопка «Sync offline» (на скачанной карте). **Верификация:** TS/Android/iOS ✅. **Остаток B3 → DEFER:** offline Utility Network (загрузка UN из offline-geodatabase), `GenerateOfflineMapParameterOverrides` (тонкая настройка слоёв/LOD), estimate-size (`OfflineMapTask.checkForUpdates`/sizing), scheduled-updates — каждый отдельная нетривиальная задача.

## Приоритет C — глубина по разделам
- **C1 — Spatial: DistanceMeasurement ✅ ГОТОВО.** `<DistanceMeasurement startLocation endLocation onMeasurementChange>` — прямое зеркало `<LineOfSight>`: `DistanceMeasurementRef : AnalysisRef` над `ExploratoryLocationDistanceMeasurement(startLocation:endLocation:)` (это `Analysis` обе платформы); событие из стрима (Swift `measurements` AsyncStream-кортеж / Kotlin `measurementChanged` SharedFlow) → `{directDistance, horizontalDistance, verticalDistance}` (`.value`, unit measurement'а, дефолт метры). `Class(DistanceMeasurementRef)` (+ `Events` Android). **Верификация:** TS/Android/iOS ✅. **DEFER:** GPU-семья `analysis.visibility` (`ViewshedFunction`/`LineOfSightFunction` — батч observer→target, иная модель), `ExploratoryGeoElement{Viewshed,LineOfSight}` (нужен `<Graphic>`-ref как GeoElement — неудобно декларативно), camera-ctor вьюшеда, per-instance цвета.
- **C2 — Geoprocessing: `date`-параметр ✅ ГОТОВО.** Тип входа `{type:'date', value: <ms>}` → Swift `GeoprocessingDate(value: Date(timeIntervalSince1970: ms/1000))` / Kotlin `GeoprocessingDate(Instant.ofEpochMilli(ms))`; выход сериализуется в ms. Job-прогресс **уже сделан в A1** (geoprocessor → JobRef). **Верификация:** TS/Android/iOS ✅. **DEFER:** `describe`/`GeoprocessingTaskInfo`-интроспекция (dataType — Swift метатип vs Kotlin enum, кросс-платформенная строка расходится), GP raster-выход (`mapImageLayer`), `multiValue`/`dataFile` параметры.
- **C3 — Symbols/Renderers (M).** `PictureMarkerSymbol` (URL/asset; Kotlin async `BitmapDrawable`), `HeatmapRenderer` (нет Kotlin-ctor → проверить factory), `DictionaryRenderer` + `DictionarySymbolStyle`/mobile-style-file, visual variables (color/size/rotation), `ModelSceneSymbol` (3D-ассет), multilayer/CIM.
- **C4 — Editing-глубина (M).** Attachments (бинарь: add/fetch/delete), batch + undo (`ServiceFeatureTable.applyEdits`/`undoLocalEdits` отдельными вызовами), templates/subtypes (`FeatureTemplate`/`FeatureType`), related features (`queryRelatedFeatures`), attribute rules/contingent values.
- **C5 — Location + Routing/Navigation (L).** Location: NMEA (`NmeaLocationDataSource`), Indoors/IPS (`IndoorsLocationDataSource`), Geotriggers. Routing: offline `RouteTask` (локальный `.geodatabase`), barriers, стопы из фич/PortalItem, навигация (`RouteTracker` + `TrackingStatus`/voice), curbApproach/timeWindows/bearing, `accumulateAttributeNames`.

## Приоритет D — нишевое
- **D1 — Real-time-глубина (M).** `onDynamicEntityChanged`-события (enter/update/purge), `ArcGISStreamServiceFilter` (where/geometry), purge/reconnection-тюнинг, observation-history (`entity.observations(max)`), popups (`PopupSource`), pull-режим (periodic feature-service refresh).
- **D2 — Geocode-глубина (S).** Offline-локатор (`LocatorTask(.loc)`), structured-address (`GeocodeParameters` + `searchValues`/категории), round-trip `SuggestResult`→`geocode(suggestResult)` нативным объектом (сейчас по строке `label`), `resultAttributeNames`/`outputSpatialReference`.
- **D3 — UN-advanced (M).** Subnetwork management (`getSubnetwork`/`SubnetworkController`), редактирование ассоциаций, validate-topology, ручной `UtilityTraceConfiguration` (не только named), terminal-configuration, tap→native-feature (identify вместо native-query).
- **D4 — Auth-глубина (M).** Per-service разные креды (map URL→login), persistent credential store (выживание между запусками), app-login (`OAuthApplicationCredential` client_id/secret), IAP/PKI/сертификаты, custom token-timeout/refresh, server-revoke на signOut.

## Платформенные пробелы SDK (не делаем, пока нет в SDK)
- 3D-редактирование геометрии (нет `geometryEditor` у SceneView), Local scene + `BuildingSceneLayer` (нет `LocalSceneView` в Swift), AR tabletop (нужен toolkit + ARKit/ARCore).

## Прочее (нишевые типы данных — по запросу)
- Слои: ENC, Annotation, Dimension, GroupLayer, FeatureCollection, ImageOverlay (frames). Камеры: orbit/globe cameraControllers. Все — точечно при необходимости.
