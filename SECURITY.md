# Security policy

## Supported versions

expo-arcgis is before 1.0, so security fixes go into the latest release only. Upgrade to it to get
them.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub instead: the repository's
**Security** tab → **Report a vulnerability**, or
[this link](https://github.com/alex-krassavin/expo-arcgis/security/advisories/new).

Say which version, platform (Android, iOS) and Expo SDK are affected, how to reproduce the problem
and what an attacker could do with it. You'll get a reply in the advisory. Once a fix is released,
the advisory is published, and it credits you unless you'd rather stay anonymous.

## Scope

- In scope: this library's TypeScript, its Android (Kotlin) and iOS (Swift) code, and its config
  plugin.
- Out of scope: the ArcGIS Maps SDKs themselves (report those to Esri), and Expo or React Native.

Never put an API key, token or other secret in an issue or a report. If one has leaked, revoke it
in your ArcGIS account.
