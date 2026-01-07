# DDI RESTful API

REST API for DDI (Data Documentation Initiative), an international standard for describing statistical and social science data.

## Description

This API provides access to DDI metadata resources.

For detailed API usage, endpoints, and examples, see the [Mock API Endpoints Documentation](docs/MOCK_API_ENDPOINTS.md).

## OpenAPI Specification

The API specification is available in the `ddi-rest.yaml` file in OpenAPI 3.1.1 format.

## Documentation & Links

### Online Documentation

- **Swagger UI**: [View on GitHub Pages](https://nicolaval.github.io/DDI-API/)

### Local Development

To view and test the API specification locally:

- **Swagger Editor**: Open [https://editor.swagger.io/](https://editor.swagger.io/) and paste the contents of `ddi-rest.yaml` or load it directly from the repository
- **Local Swagger UI**: Run `yarn build:swagger` and `yarn preview:swagger` to start a local Swagger UI server
- **Local Mock Server**: Run `yarn mock` to start a mock API server for testing

### Accept Header

The API supports multiple response formats. Use the `Accept` header to specify your preferred format:

**JSON (default):**
```bash
# Explicit JSON request
curl -H "Accept: application/json" https://api.example.com/ddi/v1/variables

# DDI-specific JSON format
curl -H "Accept: application/vnd.ddi.structure+json;version=3.3" https://api.example.com/ddi/v1/variables

# Default (JSON if no Accept header)
curl https://api.example.com/ddi/v1/variables
```

**XML:**
```bash
# DDI-specific XML format (recommended)
curl -H "Accept: application/vnd.ddi.structure+xml;version=3.3" https://api.example.com/ddi/v1/variables

# Generic XML formats
curl -H "Accept: application/xml" https://api.example.com/ddi/v1/variables
curl -H "Accept: text/xml" https://api.example.com/ddi/v1/variables
```

**Supported Content Types:**
- `application/json` - JSON format (default)
- `application/vnd.ddi.structure+json;version=3.3` - DDI JSON format
- `application/vnd.ddi.structure+xml;version=3.3` - DDI XML format (recommended for XML)
- `application/xml` - Generic XML format
- `text/xml` - Generic XML format

**Note:** If no `Accept` header is provided, the API returns JSON by default.
