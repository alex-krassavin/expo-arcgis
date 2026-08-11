import { setCompileSdkMinor } from '../withArcGISAndroid';

// The app module's build.gradle as Expo's template generates it.
const APP_BUILD_GRADLE = `apply plugin: "com.android.application"

android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.example.app'
    defaultConfig {
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }
}
`;

describe(setCompileSdkMinor, () => {
  it('adds compileSdkMinor directly below compileSdk, at the same indentation', () => {
    const result = setCompileSdkMinor(APP_BUILD_GRADLE, 0);

    expect(result).toContain(
      '    compileSdk rootProject.ext.compileSdkVersion\n    compileSdkMinor 0\n'
    );
  });

  it('is idempotent, so repeated prebuilds do not stack the line up', () => {
    const once = setCompileSdkMinor(APP_BUILD_GRADLE, 0);
    const twice = setCompileSdkMinor(once, 0);

    expect(twice).toBe(once);
    expect(twice.match(/compileSdkMinor/g)).toHaveLength(1);
  });

  it('leaves the rest of the file alone', () => {
    const result = setCompileSdkMinor(APP_BUILD_GRADLE, 0);

    expect(result.replace('\n    compileSdkMinor 0', '')).toBe(APP_BUILD_GRADLE);
  });

  it('writes the minor level it is given', () => {
    expect(setCompileSdkMinor(APP_BUILD_GRADLE, 1)).toContain('compileSdkMinor 1');
  });

  // `compileSdkVersion 37` is the older spelling and takes the whole version itself, so appending a
  // minor level to it would be wrong as well as unnecessary.
  it('does not treat compileSdkVersion as the assignment to annotate', () => {
    const legacy = APP_BUILD_GRADLE.replace(
      'compileSdk rootProject.ext.compileSdkVersion',
      'compileSdkVersion 37'
    );

    expect(() => setCompileSdkMinor(legacy, 0)).toThrow(/no compileSdk assignment/);
  });

  it('throws rather than silently producing a project that still fails in R8', () => {
    expect(() => setCompileSdkMinor('android {\n}\n', 0)).toThrow(/no compileSdk assignment/);
  });
});
