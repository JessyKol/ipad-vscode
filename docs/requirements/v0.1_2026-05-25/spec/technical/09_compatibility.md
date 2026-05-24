# Technical Spec: Compatibility

| Document | Compatibility |
|---|---|
| Version | 0.1 |
| Date | 2026-05-25 |

---

## Primary Target Platforms

| Device | OS | Priority |
|---|---|---|
| iPad Pro 12.9" (M1/M2/M4) | iPadOS 17+ | P0 — primary development target |
| iPad Pro 11" (M1/M2/M4) | iPadOS 17+ | P0 — same code, smaller screen |
| iPad Air 5/6 (M1/M2) | iPadOS 17+ | P1 — similar hardware |
| iPad (10th gen) | iPadOS 17+ | P2 — less memory, smaller display |
| iPhone | iOS 17+ | P3 — layout not optimized |
| Android tablet | Android 13+ | P3 — technically supported by Expo |
| Web (browser) | Chrome/Safari | P3 — Expo web build |

---

## Minimum OS Version

**iPadOS 16.0** (Expo SDK 51 minimum requirement).

Tested against iPadOS 17. iPadOS 16 should work but is not regularly tested in v0.1.

---

## Hardware Keyboard Compatibility

Keyboard shortcuts (⌘S, ⌘P, etc.) require a hardware keyboard.

| Keyboard | Compatibility |
|---|---|
| Magic Keyboard for iPad (USB-C) | ✅ Primary test target |
| Smart Keyboard Folio | ✅ Expected to work |
| Third-party BT keyboards (standard HID) | ✅ Expected to work |
| On-screen keyboard | ⚠️ No keyboard shortcuts; touch-only workflows |

Monaco receives hardware keyboard events when the WebView is focused. The `editor.addCommand()` API uses Monaco's key binding system which maps to actual key events.

### ⌘ Key on Non-Apple Keyboards
On third-party keyboards, `Cmd` may not be present. iOS maps `Ctrl` on third-party keyboards to `Cmd` for many shortcuts. Testing with a non-Apple keyboard is recommended for v0.2.

---

## Screen Size & Layout

| iPad | Screen | Sidebar Width | Terminal Height | Notes |
|---|---|---|---|---|
| 12.9" | 2732×2048 | 300px | 240px | Comfortable |
| 11" | 2388×1668 | 300px | 240px | Sidebar slightly tight |
| Air 11" | 2360×1640 | 300px | 240px | Similar to 11" Pro |

**v0.1 limitation:** All dimensions are hardcoded constants in `app/index.tsx`. Resizable panels planned for v0.2.

---

## Multitasking (iPadOS Split View / Slide Over)

| Mode | Status | Notes |
|---|---|---|
| Full screen | ✅ | Primary mode |
| Split View (50/50) | ⚠️ | Layout works but sidebar may be too wide |
| Split View (33%) | ⚠️ | Very tight; sidebar hidden helps |
| Slide Over | ⚠️ | Very narrow; not tested |

**v0.2 plan:** Detect window size changes and hide sidebar automatically when window width < 600px.

---

## WebView Compatibility

**iOS:** Uses WKWebView. Monaco 0.45 is tested and working.

**Android:** Uses Android WebView (Chromium-based). The inline HTML approach works on both platforms — this was a key fix in v0.1.

**Monaco CDN version:** 0.45.0 (pinned). Do not update without testing — Monaco has breaking changes between minor versions.

---

## Expo SDK Compatibility

| Expo SDK | Status |
|---|---|
| 51 (current) | ✅ Target |
| 52+ | ⚠️ Untested; upgrade when ready |
| < 50 | ❌ Not supported |

Key native modules and their versions:
```json
"expo-file-system": "~17.0.0"    ← critical; API changes between major versions
"expo-router": "~3.5.0"
"react-native-webview": "13.8.6"  ← pinned; newer versions may change postMessage behavior
"isomorphic-git": "^1.27.0"      ← patch-level updates safe; minor may change behavior
```

---

## iOS Permissions

Declared in `app.json` → `ios.infoPlist`:

```json
"UIFileSharingEnabled": true,
"LSSupportsOpeningDocumentsInPlace": true
```

These enable:
- Sharing the app's Documents folder via Files.app
- Opening files directly in the app from Files.app

**v0.2 addition:** `NSPhotoLibraryUsageDescription` if image import is added.

---

## isomorphic-git HTTPS Compatibility

| Git host | Auth method | Status |
|---|---|---|
| GitHub | PAT (username=token, password='') | ✅ Tested |
| GitHub Enterprise | PAT (same scheme) | ⚠️ Should work; untested |
| GitLab.com | PAT (same scheme) | ⚠️ Should work; untested |
| Bitbucket | App passwords | ⚠️ Should work; untested |
| Self-hosted Gitea | Basic auth | ⚠️ Should work; untested |
| SSH remotes | — | ❌ isomorphic-git HTTP only |

**CORS proxy requirement:** All git HTTP operations route through `cors.isomorphic-git.org` because the git protocol responses don't include CORS headers. This is inherent to the browser/WebView execution context and cannot be avoided without a native git module.

---

## Language Support Matrix

Languages with full Monaco support (syntax + basic IntelliSense):

| Tier | Languages |
|---|---|
| **Excellent** (Monaco built-in rich support) | TypeScript, JavaScript, JSON, CSS, HTML |
| **Good** (syntax only) | Python, Go, Rust, Java, C/C++, C#, Swift, Kotlin, PHP, Ruby, Dart |
| **Basic** | Markdown, YAML, XML, SQL, Shell, Scala, R |
| **Plaintext** | All other extensions |

---

## Offline Capability (v0.1 Limitations)

| Feature | Offline | Notes |
|---|---|---|
| File editing | ✅ | No network needed |
| File tree | ✅ | |
| Monaco editor | ❌ | CDN required |
| Git status/stage/commit | ✅ | Pure local |
| Git push/pull | ❌ | Network required |
| Clone | ❌ | Network required |

**v0.3 goal:** Bundle Monaco locally → full offline editing capability.
