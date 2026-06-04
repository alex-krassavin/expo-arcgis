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
