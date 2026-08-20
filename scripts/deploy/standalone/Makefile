# Makefile — Utility commands for server provisioning (Docker + Caddy)
# Usage: make <target>

.PHONY: help ansible-deps ansible-ping ansible-setup ansible-setup-check caddy-reload

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

ansible-deps: ## Install Ansible Galaxy collection requirements
	cd ansible && ansible-galaxy collection install -r requirements.yml

ansible-ping: ## Ping the host specified in inventory to test connection
	cd ansible && ansible all -i inventory -m ping

ansible-setup: ## Run the full server provisioning (Base setup, Docker, Caddy)
	cd ansible && ansible-playbook -i inventory playbook.yml

ansible-setup-check: ## Dry-run server provisioning (simulate changes)
	cd ansible && ansible-playbook -i inventory playbook.yml --check

caddy-reload: ## Copy Caddyfile, validate, and hot-reload Caddy in VPS without downtime
	cp caddy/Caddyfile ~/caddy/Caddyfile
	docker exec caddy-gateway-caddy-1 caddy validate --config /etc/caddy/Caddyfile
	docker exec caddy-gateway-caddy-1 caddy reload --config /etc/caddy/Caddyfile
