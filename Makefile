# Posturama - Browser-based Posture Detection System
# Pure JavaScript, no build tools or frameworks

.PHONY: all test test-verbose test-watch clean help serve

# Default target
all: test

# Run all tests
test:
	@echo "Running all tests..."
	@node test-runner.js

# Run tests with verbose output (shows stack traces)
test-verbose:
	@echo "Running tests with verbose output..."
	@VERBOSE=1 node test-runner.js

# Run specific test file
test-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make test-file FILE=posture-calculator.test.js"; \
		exit 1; \
	fi
	@echo "Running test file: $(FILE)"
	@node test-runner.js $(FILE)

# Watch mode - reruns tests when files change
test-watch:
	@echo "Starting test watcher..."
	@echo "Watching for changes in .js files..."
	@while true; do \
		clear; \
		echo "========================================"; \
		echo "Test Runner - Watching Mode"; \
		echo "========================================"; \
		node test-runner.js; \
		echo ""; \
		echo "Waiting for changes... (Ctrl+C to exit)"; \
		fswatch -1 -r --include "\.js$$" --exclude "node_modules" .; \
	done

# Simple test watcher using shell (fallback if fswatch not available)
test-watch-simple:
	@echo "Simple test watcher (checks every 2 seconds)..."
	@while true; do \
		clear; \
		date "+%H:%M:%S - Running tests..."; \
		node test-runner.js; \
		sleep 2; \
	done

# Run tests and generate simple coverage report
test-coverage:
	@echo "Analyzing test coverage..."
	@echo "Test files found:"
	@find . -name "*.test.js" -not -path "./node_modules/*" | wc -l
	@echo ""
	@echo "Source files (non-test .js):"
	@find . -name "*.js" -not -name "*.test.js" -not -path "./node_modules/*" | wc -l
	@echo ""
	@node test-runner.js

# Serve the application for browser testing
serve:
	@echo "Starting web server on http://localhost:8000"
	@echo "Press Ctrl+C to stop"
	@python3 -m http.server 8000 2>/dev/null || python -m SimpleHTTPServer 8000

# Alternative server using Node.js
serve-node:
	@echo "Starting web server on http://localhost:8000"
	@echo "Press Ctrl+C to stop"
	@node -e " \
		const http = require('http'); \
		const fs = require('fs'); \
		const path = require('path'); \
		const server = http.createServer((req, res) => { \
			let filePath = '.' + req.url; \
			if (filePath === './') filePath = './index.html'; \
			const extname = String(path.extname(filePath)).toLowerCase(); \
			const mimeTypes = { \
				'.html': 'text/html', \
				'.js': 'text/javascript', \
				'.css': 'text/css', \
				'.json': 'application/json', \
				'.png': 'image/png', \
				'.jpg': 'image/jpg', \
				'.gif': 'image/gif', \
				'.svg': 'image/svg+xml' \
			}; \
			const contentType = mimeTypes[extname] || 'application/octet-stream'; \
			fs.readFile(filePath, (error, content) => { \
				if (error) { \
					if(error.code == 'ENOENT') { \
						res.writeHead(404); \
						res.end('404 Not Found'); \
					} else { \
						res.writeHead(500); \
						res.end('Sorry, check with the site admin for error: ' + error.code); \
					} \
				} else { \
					res.writeHead(200, { 'Content-Type': contentType }); \
					res.end(content, 'utf-8'); \
				} \
			}); \
		}); \
		server.listen(8000); \
		console.log('Server running at http://localhost:8000/');"


# Quick test runner - only run fast unit tests
test-quick:
	@echo "Running quick unit tests..."
	@node test-runner.js posture-calculator.test.js

# Run integration tests
test-integration:
	@echo "Running integration tests..."
	@node test-runner.js grace-period.test.js audio-alert.test.js posture-monitor.test.js

# Run browser tests (opens test page)
test-browser:
	@echo "Opening browser integration tests..."
	@echo "Please open http://localhost:8000/browser-test.html in your browser"
	@echo "(Make sure server is running with 'make serve')"
	@open http://localhost:8000/browser-test.html 2>/dev/null || \
		xdg-open http://localhost:8000/browser-test.html 2>/dev/null || \
		echo "Please manually open: http://localhost:8000/browser-test.html"

# Format code using Prettier
format:
	@echo "Formatting code with Prettier..."
	@npx prettier --write "*.js" "*.html" "*.css" "*.md" --print-width 100 --single-quote --no-semi

# Check code formatting without modifying files
lint:
	@echo "Checking code formatting with Prettier..."
	@npx prettier --check "*.js" "*.html" "*.css" "*.md" --print-width 100 --single-quote --no-semi || \
		(echo ""; echo "Run 'make format' to fix formatting issues"; exit 1)

# Combined check for pre-commit hook
check: test lint
	@echo ""
	@echo "All checks passed! ✓"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	@rm -f *.log
	@rm -f .DS_Store
	@echo "Clean complete."

# Development setup
setup:
	@echo "Setting up development environment..."
	@echo ""
	@echo "Making test runner executable..."
	@chmod +x test-runner.js
	@echo ""
	@echo "Checking Node.js version..."
	@node --version
	@echo ""
	@echo "Checking for Python (for serving)..."
	@python3 --version 2>/dev/null || python --version
	@echo ""
	@echo "Setup complete! Run 'make test' to run tests."

# Run both tests and server in split terminal (using tmux)
dev:
	@if command -v tmux >/dev/null 2>&1; then \
		tmux new-session -d -s posturama 'make serve'; \
		tmux split-window -h 'make test-watch-simple'; \
		tmux attach-session -t posturama; \
	else \
		echo "tmux not found. Run 'make serve' and 'make test-watch' in separate terminals."; \
		exit 1; \
	fi

# Help target
help:
	@echo "Posturama - Makefile targets"
	@echo ""
	@echo "Testing:"
	@echo "  make test              - Run all tests"
	@echo "  make test-verbose      - Run tests with stack traces"
	@echo "  make test-file FILE=x  - Run specific test file"
	@echo "  make test-watch        - Watch and rerun tests on changes"
	@echo "  make test-quick        - Run only unit tests"
	@echo "  make test-integration  - Run integration tests"
	@echo "  make test-coverage     - Show test coverage summary"
	@echo ""
	@echo "Development:"
	@echo "  make serve            - Start web server (Python)"
	@echo "  make serve-node       - Start web server (Node.js)"
	@echo "  make dev              - Run server and tests in tmux"
	@echo "  make check            - Run tests and lint check"
	@echo "  make lint             - Check code formatting with Prettier"
	@echo "  make format           - Auto-format code with Prettier"
	@echo ""
	@echo "Setup:"
	@echo "  make setup            - Initial development setup"
	@echo "  make clean            - Remove generated files"
	@echo "  make help             - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make                  - Run all tests (default)"
	@echo "  make test-file FILE=posture-calculator.test.js"
	@echo "  make serve           - Start server and open http://localhost:8000"