# infra-0002: Release-Driven Continuous Deployment and Semantic Versioning Automation

- **Status**: Accepted
- **Date**: 2026-08-20
- **Category**: Infrastructure (`infra-*`)

## Context

Previously, continuous deployment (CD) builds for Docker images ran on every commit pushed to default branches (`main`/`master`). While this provided frequent builds, it introduced several drawbacks:
1. **Registry Bloat**: Pushing Docker images on every commit filled the Docker Hub container registry with unvalidated WIP commit builds.
2. **Lack of Provenance**: Untagged or SHA-only container images made it difficult to trace production Docker images back to formal release milestones.
3. **Resource Inefficiency**: Re-building multi-arch Docker images on every minor commit consumed unnecessary GitHub Actions build minutes and registry bandwidth.

Developers needed a clear, standard mechanism for triggering formal releases, generating release changelogs, publishing cross-platform Go binaries, and pushing version-tagged Docker images to Docker Hub.

## Decision

We adopted a **Release-Driven CI/CD & Automated Versioning Strategy**:

1. **Continuous Integration (CI)** (`.github/workflows/ci.yml`):
   - Triggers on **every commit and pull request** (`main`, `master`, `v*` tags).
   - Runs `golangci-lint`, unit tests, and integration tests to provide fast feedback without publishing artifacts.

2. **Continuous Deployment (CD)** (`.github/workflows/cd.yml`):
   - Triggers **ONLY when a Semantic Versioning Git tag (`v*`) is pushed** (e.g., `git push origin v1.0.0`).
   - Uses `docker/metadata-action` to automatically produce SemVer floating and exact tags on Docker Hub:
     - `1.0.0` (Exact Patch Version)
     - `1.0` (Minor Floating Tag)
     - `1` (Major Floating Tag)
     - `latest` (Production Latest Release)

3. **Release Automation** (`.goreleaser.yaml` & `.github/workflows/release.yml`):
   - Triggers on Git tag push (`v*`).
   - Compiles React SPA frontend assets (`npm run build`) before binary compilation to embed static assets (`embed.FS`).
   - Uses GoReleaser v2 to build static Go binaries across `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`, `windows/arm64`.
   - Generates release changelogs grouped by Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `build:`).
   - Publishes release archives (`.tar.gz`, `.zip`), `checksums.txt`, and release notes to **GitHub Releases**.

## Developer Release Workflow

To trigger a formal release (publishing Docker Hub images & GitHub Release binaries), run:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Consequences

### Positive
- **Production-Grade Quality**: Container images in Docker Hub are guaranteed to correspond to tested, tagged releases.
- **Zero Registry Bloat**: Eliminates clutter from intermediate WIP commit builds.
- **Automated Traceability**: Docker Hub image tags (`1.0.0`, `latest`) and GitHub Releases remain 100% in sync with exact Git commit SHAs and build timestamps.

### Negative
- Developers must explicitly create and push a Git tag (`v*`) to publish new Docker Hub images and GitHub Releases.
