.DEFAULT_GOAL := package

.PHONY: package
package:
	npm run package

.PHONY: install
install:
	npm install
