Pod::Spec.new do |s|
  s.name           = 'ExpoArcgisToolkit'
  s.version        = '0.1.0'
  s.summary        = 'ArcGIS Maps SDK Toolkit components for expo-arcgis'
  s.description    = 'ArcGIS Maps SDK for Swift Toolkit components (compass, scalebar, basemap gallery, …) for expo-arcgis.'
  s.author         = 'krassavin'
  s.homepage       = 'https://mapforge.dev/expo-arcgis'
  s.platforms      = {
    :ios => '18.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # The core: its views and shared objects. It also brings the ArcGIS Maps SDK itself.
  s.dependency 'ExpoArcgis'

  # ArcGIS Maps SDK for Swift Toolkit (300.1.0) — one Swift package, `ArcGISToolkit`. It depends on
  # the SDK package the core already adds (`from: "300.1.0"`), and SwiftPM resolves the two into one.
  # Package: https://github.com/Esri/arcgis-maps-sdk-swift-toolkit
  spm_dependency(s,
    url: 'https://github.com/Esri/arcgis-maps-sdk-swift-toolkit',
    requirement: {
      kind: 'exactVersion',
      version: '300.1.0',
    },
    products: ['ArcGISToolkit']
  )

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
