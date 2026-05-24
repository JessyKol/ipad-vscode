# Technical Spec: Security

| Document | Security |
|---|---|
| Version | 0.1 |
| Date | 2026-05-25 |

---

## Threat Model

iPad VSCode operates in a single-user, on-device context. Primary threats:

| Threat | Source | Risk Level |
|---|---|---|
| GitHub token exposure | Logging, error messages, JS bundle | High |
| Code execution from edited files | None (no eval of user files) | Low |
| XSS via Monaco WebView | Malicious file content rendered in WebView | Medium |
| Network MITM (push/pull) | Compromised CDN or CORS proxy | Medium |
| Unintended file writes | Bug in save path, race condition | Low |

---

## GitHub Token Security

**v0.1 posture:** Token is stored in Zustand (JavaScript memory) only.

**Guarantees:**
- Token is never written to `console.log`, `console.error`, or any output visible in terminal
- Token is never included in Alert messages shown to the user
- Token is never stored to disk (expo-file-system, AsyncStorage)
- Token is transmitted only over HTTPS to GitHub servers

**v0.1 Risks:**
- Token lives in the JS heap and could theoretically be inspected if device is compromised (jailbroken)
- Token is lost on app restart (users must re-enter it)

**v0.2 Plan:** Migrate to `expo-secure-store` which uses iOS Keychain:
```typescript
await SecureStore.setItemAsync('github_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
});
const token = await SecureStore.getItemAsync('github_token');
```

---

## WebView Security

Monaco runs in a WKWebView (iOS). The inline HTML includes a Content Security Policy meta tag:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
```

**Current CSP is permissive** — required because Monaco uses dynamic script loading internally.

**v0.2 plan:** Tighten CSP when Monaco is bundled locally:
```
default-src 'none';
script-src 'self' 'unsafe-eval';  ← Monaco needs eval for language workers
style-src 'self' 'unsafe-inline';
```

**XSS Risk:** Monaco editor renders file contents in a sandboxed DOM. Monaco's editor escapes HTML when displaying code, so injected HTML/JS in a file is treated as text, not executed.

**postMessage security:** The WebView only accepts messages from `window` (our RN code). The `originWhitelist={['*']}` allows the inline HTML origin (`null`). No external origin can post messages to our WebView because there is no cross-origin frame.

---

## Network Security

### HTTPS Enforcement
All remote operations (clone, push, pull) use HTTPS via isomorphic-git's HTTP transport. No HTTP (plaintext) is used.

### CORS Proxy
```
https://cors.isomorphic-git.org
```

This is a trusted, open-source CORS proxy operated by the isomorphic-git project. Requests are proxied to GitHub's git servers. **The proxy sees the request URL and headers, including the Authorization header containing the token.**

**Risk:** If the proxy is compromised, tokens could be captured.

**Mitigation in v0.2:** Self-host the CORS proxy, or use a proxy endpoint on the user's own server. Alternatively, for GitHub specifically, use the Octokit REST API (no CORS proxy needed) for push/pull.

### Certificate Pinning
Not implemented in v0.1. iOS enforces ATS (App Transport Security) which requires valid TLS certificates. This provides baseline protection against MITM on trusted networks.

---

## File System Security

### Isolation
The app operates within iOS app sandbox (`Documents/`). It cannot access files outside this sandbox (no access to other apps' data, no `/etc`, no system files).

### Write Safety
`expo-file-system`'s `writeAsStringAsync` is atomic on iOS (uses NSFileManager write-to-temp-then-rename pattern). A crash mid-write leaves either the old file or the new file intact, not a corrupt partial write.

### Path Traversal
User-provided inputs (workspace name, file name, rename target) are not sanitised against path traversal attacks (`../../etc/passwd`). On iOS, this is low risk because the sandbox prevents access outside `Documents/`. Still, add basic path validation in v0.2:
```typescript
function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|.]/g, '_').slice(0, 255);
}
```

---

## No Telemetry (v0.1)

v0.1 collects no telemetry, analytics, or crash data. If crash reporting is added in future versions, it must:
- Be opt-in
- Exclude file contents and tokens from crash reports
- Comply with applicable privacy regulations

---

## Security Checklist for Each Release

- [ ] GitHub token not visible in any log output
- [ ] GitHub token not written to disk
- [ ] `console.log` statements don't include auth headers or token values
- [ ] No `eval()` of user-provided file content (Monaco eval is internal only)
- [ ] HTTPS used for all network requests
- [ ] New dependencies audited with `npm audit`
