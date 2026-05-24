# k6 Performance Tests

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

macOS:
```bash
brew install k6
```

## Usage

### Local (backend must be running)
```bash
# Health check smoke test
k6 run k6/health.js

# Auth endpoint load test
k6 run k6/auth.js

# Cameras CRUD load test
k6 run k6/cameras.js

# Custom API base
k6 run k6/health.js -e API_BASE=http://localhost:5001
```

### CI
These are integrated into `.github/workflows/perf.yml` which starts the backend stack and runs k6 against it.

## Adding new scenarios
Create a new `.js` file in this directory following the k6 scripting API:
https://k6.io/docs/javascript-api/
