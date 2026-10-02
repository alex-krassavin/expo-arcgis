// Entry point Expo CLI resolves for this package's config plugin.
// Re-exports the compiled plugin from plugin/build (built by `npm run prepare` / `build:plugin`).
module.exports = require('./plugin/build');
