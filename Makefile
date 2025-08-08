.DEFAULT_GOAL := package

.PHONY: check-install compile package
package: compile
	npm run package

.PHONY: install
install:
	npm install

.PHONY: check-install
check-install:
	@if [ ! -d "node_modules" ]; then \
		echo "installing npm packages..."; \
		npm install; \
	fi

.PHONY: compile
compile: check-install
	npm run compile