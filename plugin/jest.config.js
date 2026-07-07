// Plugin code runs in Node during prebuild, so no jest-expo/react-native preset —
// just strip TypeScript and convert ESM to CJS.
module.exports = {
  testEnvironment: 'node',
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
