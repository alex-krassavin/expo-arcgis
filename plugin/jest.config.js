// Plugin code runs in Node during prebuild, so no jest-expo/react-native preset —
// just strip TypeScript and convert ESM to CJS.
module.exports = {
  testEnvironment: 'node',
  // Default testMatch grabs everything under __tests__, including the xcode.d.ts shim.
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '\\.ts$': [
      'babel-jest',
      {
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
};
