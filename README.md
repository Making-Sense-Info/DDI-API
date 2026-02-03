# DDI API

REST API for DDI (Data Documentation Initiative), an international standard for describing statistical and social science data.

### Get involved

- **[Follow the roadmap](https://github.com/orgs/Making-Sense-Info/projects/6)**
- **[Issues](https://github.com/Making-Sense-Info/DDI-API/issues)** — Report bugs or give feedback (feature requests, API improvements).
- **[Discussions](https://github.com/Making-Sense-Info/DDI-API/discussions)** — Share use cases, ask questions, and discuss with the DDI community.

## Description

This API provides access to DDI metadata resources.

For detailed API usage, endpoints, and examples, see the [Mock API Endpoints Documentation](docs/MOCK_API_ENDPOINTS.md).

## OpenAPI Specification

The API specification is available in the `ddi-rest.yaml` file in OpenAPI 3.1.1 format.

## Documentation & Links

### Online Documentation

- **Swagger UI**: [View on GitHub Pages](https://making-sense-info.github.io/DDI-API/)

### Local Development

To view and test the API specification locally:

- **Swagger Editor**: Open [https://editor.swagger.io/](https://editor.swagger.io/) and paste the contents of `ddi-rest.yaml` or load it directly from the repository
- **Local Swagger UI**: Run `yarn build:swagger` and `yarn preview:swagger` to start a local Swagger UI server
- **Local Mock Server**: Run `yarn mock` to start a mock API server for testing

### Accept Header

The API supports DDI-specific response formats only. Use the `Accept` header to specify your preferred format:

**DDI JSON Format (default):**
```bash
# DDI JSON format (default - no Accept header needed)
curl https://api.example.com/ddi/v1/variables

# Explicit DDI JSON request
curl -H "Accept: application/vnd.ddi.structure+json;version=3.3" https://api.example.com/ddi/v1/variables
```

**DDI XML Format:**
```bash
# DDI XML format (requires Accept header)
curl -H "Accept: application/vnd.ddi.structure+xml;version=3.3" https://api.example.com/ddi/v1/variables
```

**Supported Content Types:**
- `application/vnd.ddi.structure+json;version=3.3` - DDI JSON format (default if no Accept header)
- `application/vnd.ddi.structure+xml;version=3.3` - DDI XML format

**Note:** 
- If no `Accept` header is provided, the API returns DDI JSON format by default.
- Generic formats (`application/json`, `application/xml`, `text/xml`) are not supported and will return a `406 Not Acceptable` error.
