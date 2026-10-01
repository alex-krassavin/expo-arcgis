/// <reference types="nativewind/types" />

// NativeWind's stylesheet is a side-effect import (`import '../global.css'`). TypeScript 6 checks
// those, and nothing else declares `.css` modules.
declare module '*.css';
