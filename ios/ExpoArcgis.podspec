Pod::Spec.new do |s|
  s.name           = 'ExpoArcgis'
  s.version        = '0.1.0'
  s.summary        = 'ArcGIS Maps SDK for React Native (Expo module)'
  s.description    = 'Native ArcGIS Maps SDK rendering for React Native on iOS, via the Expo modules API.'
  s.author         = 'krassavin'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '17.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # ArcGIS Maps SDK for Swift (300.0.0) is distributed as a binary xcframework via
  # Swift Package Manager. `spm_dependency` (React Native 0.75+) wires the SPM product
  # into this pod target so the module's Swift code can `import ArcGIS`.
  # Package: https://github.com/Esri/arcgis-maps-sdk-swift — requires Xcode 26 / iOS 17+.
  spm_dependency(s,
    url: 'https://github.com/Esri/arcgis-maps-sdk-swift',
    requirement: {
      kind: 'exactVersion',
      version: '300.0.0',
    },
    products: ['ArcGIS']
  )

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
