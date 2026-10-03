# DDI API

REST API for **DDI Lifecycle** ([DDI-L](https://ddialliance.org/)) metadata — study units, datasets, variables, concepts, schemes, and related structure items.

**Current scope:** DDI-L **3.3** only (vendor media types `application/vnd.ddi.structure+json;version=3.3` and XML equivalent).

**Target scope:** DDI **Codebook** (DDI-C), **Lifecycle** (DDI-L), and **Cross Domain Integration** (DDI-CDI), with version negotiation per product. v1 of this spec and mock implements Lifecycle 3.3 only.

### [Swagger UI](https://making-sense-info.github.io/DDI-API/)

Interactive OpenAPI 3.1 documentation — browse every endpoint and try requests against the live mock.

The mock server is at **[ddi-api.making-sense.info](https://ddi-api.making-sense.info)** (base path `/ddi/v1`). The contract itself lives in [`ddi-rest.yaml`](ddi-rest.yaml).

Variable, CodeList, Concept, Schemes, and Groups XML/JSON follow the Making Sense DDI-L 3.3 structure profile aligned with Mekong conversion `toDOM`:
- Variable: `l:VariableRepresentation` (`r:Code|Numeric|Text|DateTimeRepresentation`), `r:ConceptReference`, `r:SourceVariableReference`
- Concept: `c:Concept` + `c:SubclassOfReference` (no `c:Definition`)
- CodeList / Category: `l:CodeList`, `l:Code`, `l:CategoryScheme`, `l:Category`
- Schemes: `c:ConceptScheme` / `l:VariableScheme` / `l:CodeListScheme` / `l:CategoryScheme` with matching `*SchemeName`
- Groups: `c:ConceptGroup` (`r:ConceptReference` members), `l:VariableGroup` (`l:TypeOfVariableGroup`, `r:VariableReference`)
- Identity: JSON `agencyID` → XML `r:Agency`

When changing that contract, update `ddi-rest.yaml`, mock JSON under `mocks/data/`, and `mocks/ddi-xml-converter.js` together.

## Quick start

```bash
# Aggregated catalog (all item collections — see below; prefer /variables etc. in production)
curl https://ddi-api.making-sense.info/ddi/v1/items

# Variables (DDI JSON is the default)
curl https://ddi-api.making-sense.info/ddi/v1/variables

# Same list as DDI XML
curl -H "Accept: application/vnd.ddi.structure+xml;version=3.3" \
  https://ddi-api.making-sense.info/ddi/v1/variables
```

More examples, filters, and identifier rules: [Mock API endpoints](docs/MOCK_API_ENDPOINTS.md).

## Using the API

- **`GET /items`** — returns an **`ItemCatalog`**: one JSON object whose properties are **collections** (`variables`, `concepts`, `conceptSchemes`, …), each an array of DDI items. Same filters as per-type lists, but **not paginated** (can be large). For routine access, use paginated `/variables`, `/concepts`, etc.
- **`GET /items/{itemIdentifier}`** — returns **one** DDI item (polymorphic lookup when the type is unknown).
- **Identifiers:** a DDI URN (`urn:ddi:{agency}:{id}:{version}`) is enough. A plain ID needs `agencyID` and `version` on the same request (`400` otherwise).
- **Lists** (per-type endpoints and `/search/labels`) are always paginated (`limit` default 100, max 1000; `offset` default 0). Page metadata is in `Content-Range` and `Link`, not in the DDI body.
- **Media types:** `application/vnd.ddi.structure+json;version=3.3` (default) and `application/vnd.ddi.structure+xml;version=3.3`. Generic `application/json` or `application/xml` return `406`.

Full rules are in the [Swagger UI](https://making-sense-info.github.io/DDI-API/) description and in `ddi-rest.yaml`.

## Local development

```bash
yarn mock              # mock server → http://localhost:4010
yarn build:swagger && yarn preview:swagger   # local Swagger UI → http://localhost:8080
```

You can also paste `ddi-rest.yaml` into [Swagger Editor](https://editor.swagger.io/). Node **24+** is required (`engines.node`).

## Get involved

- [Roadmap](https://github.com/orgs/Making-Sense-Info/projects/6)
- [Issues](https://github.com/Making-Sense-Info/DDI-API/issues)
- [Discussions](https://github.com/Making-Sense-Info/DDI-API/discussions)
