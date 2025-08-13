.DEFAULT_GOAL := package

.PHONY: compile package
package: compile
	npm run package

.PHONY: install
install:
	npm install

node_modules: package-lock.json
	npm ci

.PHONY: compile
compile: node_modules
	npm run compile