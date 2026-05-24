# Requirements Directory

Versioned PRDs and technical specifications for iPad VSCode.

## Directory Convention

```
docs/requirements/
  v{major}.{minor}_{YYYY-MM-DD}/
    PRD.md                        Product Requirements Document
    spec/
      00_overview.md              System architecture & data flows
      modules/
        01_editor.md              Monaco WebView module
        02_filesystem.md          File system service
        03_git.md                 Git engine
        04_terminal.md            Terminal panel
        05_search.md              Search panel
        06_settings.md            Settings panel
      technical/
        07_performance.md         Performance targets & bottlenecks
        08_security.md            Threat model & mitigations
        09_compatibility.md       OS, device, keyboard, git host compatibility
```

## Version Index

| Version | Date | Status | Key Focus |
|---|---|---|---|
| [v0.1](v0.1_2026-05-25/) | 2026-05-25 | Released | Foundation: Monaco on iPad, unified FS/git, core features |
| v0.2 | TBD | Planned | Settings persistence, resizable panels, SSH terminal |
| v0.3 | TBD | Planned | Offline Monaco, split editor, LSP-lite |
| v1.0 | TBD | Planned | App Store ready |

## How to Update

When starting a new version:
1. `cp -r docs/requirements/v0.1_2026-05-25/ docs/requirements/v0.2_YYYY-MM-DD/`
2. Update version/date fields in each document
3. Update PRD with new requirements (keep old ones that are still relevant)
4. Update spec files for changed modules
5. Add new spec files for new modules
6. Update this README's version index

## AI-Friendly Guidelines

These documents are written to be usable as context for AI assistants working on this project.

Each document should:
- Include a header table with version and date
- State invariants and constraints explicitly (not just goals)
- Document **why** decisions were made, not just what was decided
- List known limitations clearly — AI assistants need to know what's broken to avoid perpetuating bugs
- Use concrete examples and data flows rather than abstract descriptions
