package config

import (
	"runtime"
	"time"
)

var (
	// Version is injected via -ldflags "-X 'github.com/semmidev/url-shortener/server/internal/config.Version=x.y.z'"
	Version = "1.0.0"
	// BuildTime is injected via -ldflags "-X 'github.com/semmidev/url-shortener/server/internal/config.BuildTime=YYYY-MM-DDTHH:MM:SSZ'"
	BuildTime = "unknown"
	// GitCommit is injected via -ldflags "-X 'github.com/semmidev/url-shortener/server/internal/config.GitCommit=commit_hash'"
	GitCommit = "unknown"
	// startTime records when the server binary started running
	startTime = time.Now()
)

type BuildInfo struct {
	Version     string `json:"version"`
	BuildTime   string `json:"build_time"`
	GitCommit   string `json:"git_commit"`
	GoVersion   string `json:"go_version"`
	Environment string `json:"environment"`
	Uptime      string `json:"uptime"`
}

// GetBuildInfo constructs current runtime and build metadata.
func GetBuildInfo(env string) BuildInfo {
	bt := BuildTime
	if bt == "unknown" || bt == "" {
		bt = startTime.UTC().Format(time.RFC3339)
	}

	return BuildInfo{
		Version:     Version,
		BuildTime:   bt,
		GitCommit:   GitCommit,
		GoVersion:   runtime.Version(),
		Environment: env,
		Uptime:      time.Since(startTime).Truncate(time.Second).String(),
	}
}
