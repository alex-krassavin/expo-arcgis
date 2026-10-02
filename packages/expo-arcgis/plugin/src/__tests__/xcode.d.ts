// The xcode package (used at runtime by @expo/config-plugins) ships no types.
declare module 'xcode' {
  export function project(filePath: string): any;
}
