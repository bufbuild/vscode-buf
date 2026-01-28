.DEFAULT_GOAL := package

UNAME_OS := $(shell uname -s)

ifeq ($(UNAME_OS),Darwin)
# Explicitly use the "BSD" sed shipped with Darwin. Otherwise if the user has a
# different sed (such as gnu-sed) on their PATH this will fail in an opaque
# manner. /usr/bin/sed can only be modified if SIP is disabled, so this should
# be relatively safe.
SED_I := /usr/bin/sed -i ''
endif
ifeq ($(UNAME_OS),Linux)
SED_I := sed -i
endif


.PHONY: package
package:
	npm run package

.PHONY: install
install:
	npm install

# This target is used in ./.github/workflows/publish.yaml;
# do not change it without updating the callsite there.
.PHONY: updatechangelog
updatechangelog:
ifndef VERSION
	$(error VERSION is required. Usage: make updatechangelog VERSION=1.0.0)
endif
	@echo "Updating CHANGELOG.md with version $(VERSION)..."
	$(SED_I) 's/^## Unreleased$$/## Unreleased\n\n## $(VERSION)/' CHANGELOG.md
	@echo "Done! CHANGELOG.md updated."
