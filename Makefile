.PHONY: dev build start lint clean setup rebuild

# Dev server
dev:
	npm run dev

# Production build
build:
	npm run build

# Start production server
start:
	npm start

# Lint code
lint:
	npm run lint

# Clean build artifacts
clean:
	rm -rf .next

# Full clean (including deps)
distclean:
	rm -rf .next node_modules

# Install dependencies
setup:
	npm install

# Rebuild from scratch
rebuild: distclean setup build
