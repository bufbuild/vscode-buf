.DEFAULT_GOAL := package

.PHONY: package
package:
	npx vsce package

.PHONY: install
install:
	npm install
