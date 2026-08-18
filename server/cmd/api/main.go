package main

import (
	"log"

	"github.com/semmidev/url-shortener/server/internal/app"
	"github.com/semmidev/url-shortener/server/internal/config"
)

// @title URL Shortener API
// @version 1.0
// @description High-Performance Modular Monolith URL Shortener REST API in Go.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url https://github.com/semmidev/url-shortener

// @license.name MIT
// @license.url https://github.com/semmidev/url-shortener/blob/main/LICENSE

// @host localhost:8080
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Input your Bearer token in the format "Bearer <token>".
func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	if err := app.Run(cfg); err != nil {
		log.Fatalf("application runtime error: %v", err)
	}
}
