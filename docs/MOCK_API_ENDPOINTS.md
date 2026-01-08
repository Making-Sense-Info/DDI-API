# Mock API - Endpoints Documentation

This guide explains how to use the mock API endpoints for testing the DDI REST API.

## Overview

The mock server serves realistic data examples in both French and English, including:
- Variables
- Concepts
- Concept Schemes
- Variable Schemes
- Code Lists
- Code List Schemes
- Category Schemes
- Categories

### Response Formats

The mock API supports both **JSON** and **XML** formats:

- **JSON** (default): `application/json` or `application/vnd.ddi.structure+json;version=3.3`
- **XML**: `application/vnd.ddi.structure+xml;version=3.3`, `application/xml`, or `text/xml`

The format is determined by the `Accept` header in your request. If no `Accept` header is provided, JSON is returned by default.

### All Endpoints Supported

All endpoints from the OpenAPI specification are implemented:

**List Endpoints** (with filtering and pagination):
- `GET /ddi/v1/variables`
- `GET /ddi/v1/concepts`
- `GET /ddi/v1/concept-schemes`
- `GET /ddi/v1/variable-schemes`
- `GET /ddi/v1/code-lists`
- `GET /ddi/v1/code-list-schemes`
- `GET /ddi/v1/category-schemes`

**Single Resource Endpoints**:
- `GET /ddi/v1/variables/{variableID}`
- `GET /ddi/v1/concepts/{conceptID}`
- `GET /ddi/v1/concept-schemes/{conceptSchemeID}`
- `GET /ddi/v1/variable-schemes/{variableSchemeID}`
- `GET /ddi/v1/code-lists/{codeListID}`
- `GET /ddi/v1/code-list-schemes/{codeListSchemeID}`
- `GET /ddi/v1/category-schemes/{categorySchemeID}`

**Search Endpoints**:
- `GET /ddi/v1/search/labels` - Search resources by label

**Utility Endpoints**:
- `GET /health` - Health check
- `GET /` - Service information

## Local Development

### Start the Mock Server

```bash
yarn mock
```

The mock server will run on `http://localhost:4010`

### Test the Mock API

**JSON (default):**
```bash
# Get all variables (JSON)
curl http://localhost:4010/ddi/v1/variables

# Get a specific variable (without references - default)
curl http://localhost:4010/ddi/v1/variables/var-001

# Get a specific variable with direct references resolved (children level)
curl http://localhost:4010/ddi/v1/variables/var-001?references=children

# Get a specific variable with all references resolved recursively
curl http://localhost:4010/ddi/v1/variables/var-001?references=all

# Get all concepts
curl http://localhost:4010/ddi/v1/concepts

# Get a specific concept (without references - default)
curl http://localhost:4010/ddi/v1/concepts/concept-001

# Get a specific concept with direct references resolved
curl http://localhost:4010/ddi/v1/concepts/concept-001?references=children

# Get a specific concept with all references resolved recursively
curl http://localhost:4010/ddi/v1/concepts/concept-001?references=all

# Get all code lists
curl http://localhost:4010/ddi/v1/code-lists

# Get a specific code list (without references - default)
curl http://localhost:4010/ddi/v1/code-lists/codelist-001

# Get a specific code list with direct references resolved
curl http://localhost:4010/ddi/v1/code-lists/codelist-001?references=children

# Get a specific code list with all references resolved recursively
curl http://localhost:4010/ddi/v1/code-lists/codelist-001?references=all

# Health check
curl http://localhost:4010/health
```

**XML:**
```bash
# Get all variables (XML)
curl -H "Accept: application/vnd.ddi.structure+xml;version=3.3" http://localhost:4010/ddi/v1/variables

# Get a specific variable (XML)
curl -H "Accept: application/xml" http://localhost:4010/ddi/v1/variables/var-001

# Get variable with references resolved (XML)
curl -H "Accept: application/xml" "http://localhost:4010/ddi/v1/variables/var-001?references=all"

# Get all concepts (XML)
curl -H "Accept: application/xml" http://localhost:4010/ddi/v1/concepts

# Get a specific concept (XML)
curl -H "Accept: application/xml" http://localhost:4010/ddi/v1/concepts/concept-001

# Get code lists (XML)
curl -H "Accept: application/xml" http://localhost:4010/ddi/v1/code-lists
```

## Search Endpoints

### Search by Labels

The `/ddi/v1/search/labels` endpoint allows you to search for DDI resources by matching their labels.

**Endpoint:** `GET /ddi/v1/search/labels`

**Parameters:**
- **`q`** (required): Search query string. Case-insensitive partial matching.
- **`lang`** (optional): Language code for label search (`en` or `fr`). Default: `en`
- **`type`** (optional): Filter results by resource type. Can be one or more of: `Variable`, `Concept`, `ConceptScheme`, `VariableScheme`, `CodeList`, `CodeListScheme`, `CategoryScheme`, `Category`
- **`offset`** (optional): Pagination offset. Default: `0`
- **`limit`** (optional): Maximum number of results. Default: `100`, Maximum: `1000`

**Examples:**

```bash
# Search for "age" in English labels (default)
curl "http://localhost:4010/ddi/v1/search/labels?q=age"

# Search for "âge" in French labels
curl "http://localhost:4010/ddi/v1/search/labels?q=âge&lang=fr"

# Search only in Variables
curl "http://localhost:4010/ddi/v1/search/labels?q=baseline&type=Variable"

# Search in multiple resource types
curl "http://localhost:4010/ddi/v1/search/labels?q=gender&type=Variable&type=Concept"

# Search with pagination
curl "http://localhost:4010/ddi/v1/search/labels?q=age&offset=0&limit=10"

# Search in XML format
curl -H "Accept: application/xml" "http://localhost:4010/ddi/v1/search/labels?q=age"
```

**Response Format:**

Each result contains:
- `type`: The resource type (Variable, Concept, ConceptScheme, etc.)
- `urn`: The URN of the resource
- `id`: The identifier of the resource
- `agencyID`: The agency ID
- `version`: The version
- `label`: All labels for the resource (in all languages)
- `matchedLabel`: The specific label that matched the search query (in the specified language)

**Example Response:**

```json
[
  {
    "type": "Variable",
    "urn": "urn:ddi:example.agency:var-001:1.0.0",
    "id": "var-001",
    "agencyID": "example.agency",
    "version": "1.0.0",
    "label": [
      {
        "lang": "en",
        "value": "Age at baseline examination"
      },
      {
        "lang": "fr",
        "value": "Âge à l'examen de base"
      }
    ],
    "matchedLabel": {
      "lang": "en",
      "value": "Age at baseline examination"
    }
  }
]
```

**Notes:**
- The search is case-insensitive
- Partial matching is performed (e.g., searching for "age" will match "Age at baseline" and "average")
- Only labels in the specified language (`lang` parameter) are searched
- If no `type` parameter is provided, all resource types are searched
- Results are paginated using `offset` and `limit` parameters

### Understanding the `references` Parameter

The `references` query parameter controls how referenced objects are returned. It supports three levels:

**Important:** When references are resolved (`references=children` or `references=all`), the property name changes from `xxxReference` to `xxx`. **Only one property is present, never both.** For example:
- `conceptReference` → `concept` (full Concept object)
- `codeListReference` → `codeList` (full CodeList object)
- `categoryReference` → `category` (full Category object)
- `subclassOfReference` → `subclassOf` (full Concept object)
- `sourceVariableReference` → `sourceVariable` (full Variable object)

**Note:** Objects that are children of schemes (like Concepts in ConceptScheme, CodeLists in CodeListScheme) do not have references back to their parent scheme. The relationship is one-way: schemes contain lists of their children. When `references=children` or `references=all`, these identifier lists are resolved to full objects.

- **`references=none` (default)**: Returns only references (URN, id, agencyID, version, typeOfObject)
  ```bash
  curl http://localhost:4010/ddi/v1/variables/var-001
  # or explicitly
  curl http://localhost:4010/ddi/v1/variables/var-001?references=none
  ```
  Response includes:
  ```json
  {
    "conceptReference": {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "agencyID": "example.agency",
      "version": "1.0.0",
      "typeOfObject": "Concept"
    }
  }
  ```

- **`references=children`**: Returns full referenced objects at the root level, but references within those objects remain as references. The property name changes from `xxxReference` to `xxx` when resolved.
  ```bash
  curl http://localhost:4010/ddi/v1/variables/var-001?references=children
  ```
  Response includes:
  ```json
  {
    "concept": {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "name": [{"lang": "en", "value": "age"}],
      "label": [{"lang": "en", "value": "Age"}],
      "description": [...],
      "definition": [...],
      "isUniversallyUnique": true
    }
  }
  ```
  Note: The `conceptReference` property is replaced by `concept` containing the full Concept object. Concepts do not have references back to their parent ConceptScheme.

- **`references=all`**: Returns full referenced objects recursively, including all nested references. The property name changes from `xxxReference` to `xxx` when resolved.
  ```bash
  curl http://localhost:4010/ddi/v1/variables/var-001?references=all
  ```
  Response includes:
  ```json
  {
    "concept": {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "name": [{"lang": "en", "value": "age"}],
      "label": [{"lang": "en", "value": "Age"}],
      "description": [...],
      "definition": [...],
      "isUniversallyUnique": true
    }
  }
  ```
  Note: All references are recursively resolved. Property names change from `xxxReference` to `xxx` (e.g., `conceptReference` → `concept`). Concepts do not have references back to their parent ConceptScheme, so there's no `conceptScheme` property in Concept objects.

### Variable with Code List Representation

Variables can have a representation that references a code list. Here's how to retrieve them:

```bash
# Get variable with code list reference (without resolving - default)
curl http://localhost:4010/ddi/v1/variables/var-002

# Get variable with code list reference resolved (children level)
curl http://localhost:4010/ddi/v1/variables/var-002?references=children

# Get variable with code list and all nested references resolved (all level)
curl http://localhost:4010/ddi/v1/variables/var-002?references=all
```

**With `references=none` (default):**
```json
{
  "id": "var-002",
  "representation": {
    "codeRepresentation": {
      "recommendedDataType": "String",
      "codeListReference": {
        "urn": "urn:ddi:example.agency:codelist-001:1.0.0",
        "id": "codelist-001",
        "agencyID": "example.agency",
        "version": "1.0.0",
        "typeOfObject": "CodeList"
      }
    }
  }
}
```

**With `references=children`:**
```json
{
  "id": "var-002",
  "representation": {
    "codeRepresentation": {
      "recommendedDataType": "String",
      "codeList": {
        "urn": "urn:ddi:example.agency:codelist-001:1.0.0",
        "id": "codelist-001",
        "name": [{"lang": "en", "value": "gender_codes"}],
        "label": [{"lang": "en", "value": "Gender Codes"}],
        "codes": [
          {
            "id": "code-001",
            "value": "M",
            "category": {
              "urn": "urn:ddi:example.agency:category-001:1.0.0",
              "id": "category-001",
              "agencyID": "example.agency",
              "version": "1.0.0",
              "label": [{"lang": "en", "value": "Male"}, {"lang": "fr", "value": "Masculin"}]
            }
          },
          ...
        ]
      }
    }
  }
}
```
Note: The `codeListReference` property is replaced by `codeList` containing the full CodeList object with all codes. Codes have their `categoryReference` replaced by `category` (full Category object). CodeLists do not have references back to their parent CategoryScheme.

**With `references=all`:**
```json
{
  "id": "var-002",
  "representation": {
    "codeRepresentation": {
      "recommendedDataType": "String",
      "codeList": {
        "urn": "urn:ddi:example.agency:codelist-001:1.0.0",
        "id": "codelist-001",
        "name": [{"lang": "en", "value": "gender_codes"}],
        "label": [{"lang": "en", "value": "Gender Codes"}],
        "codes": [
          {
            "id": "code-001",
            "value": "M",
            "category": {
              "urn": "urn:ddi:example.agency:category-001:1.0.0",
              "id": "category-001",
              "label": [{"lang": "en", "value": "Male"}, {"lang": "fr", "value": "Masculin"}]
            }
          },
          ...
        ]
      }
    }
  }
}
```
Note: All references are recursively resolved and property names change: `codeListReference` → `codeList`, `categoryReference` → `category`. CodeLists do not have references back to their parent CategoryScheme, so there's no `categoryScheme` property in CodeList objects.

### Code Lists Examples

Code lists can have nested references that are resolved at different levels:

```bash
# Get code list without references (default)
curl http://localhost:4010/ddi/v1/code-lists/codelist-001

# Get code list with direct references resolved (children level)
curl http://localhost:4010/ddi/v1/code-lists/codelist-001?references=children

# Get code list with all references resolved recursively
curl http://localhost:4010/ddi/v1/code-lists/codelist-001?references=all
```

**With `references=children`:**
- `categoryReference` is replaced by `category` (full Category object) in each code
- References inside categories remain as references
- CodeLists do not have references back to their parent CategoryScheme

**With `references=all`:**
- `categoryReference` is replaced by `category` (full Category object) in each code
- All nested references are resolved recursively
- CodeLists do not have references back to their parent CategoryScheme

### Scheme Examples

Schemes (ConceptScheme, VariableScheme, CodeListScheme, CategoryScheme) contain arrays of identifiers for their children. These identifiers are resolved to full objects when `references` is not `none`:

```bash
# Get concept scheme without resolving children (default)
curl http://localhost:4010/ddi/v1/concept-schemes/conceptscheme-001

# Get concept scheme with children resolved as full objects (children level)
curl http://localhost:4010/ddi/v1/concept-schemes/conceptscheme-001?references=children

# Get concept scheme with children and all nested references resolved (all level)
curl http://localhost:4010/ddi/v1/concept-schemes/conceptscheme-001?references=all
```

**With `references=none` (default):**
```json
{
  "id": "conceptscheme-001",
  "concepts": [
    {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "agencyID": "example.agency",
      "version": "1.0.0"
    }
  ]
}
```
Note: Children are returned as identifiers only (URN, id, agencyID, version).

**With `references=children`:**
```json
{
  "id": "conceptscheme-001",
  "concepts": [
    {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "name": [{"lang": "en", "value": "age"}],
      "label": [{"lang": "en", "value": "Age"}],
      "description": [...],
      "definition": [...],
      "isUniversallyUnique": true
    }
  ]
}
```
Note: Children identifiers are resolved to full objects. References within these objects (like `subclassOfReference`) remain as references.

**With `references=all`:**
```json
{
  "id": "conceptscheme-001",
  "concepts": [
    {
      "urn": "urn:ddi:example.agency:concept-001:1.0.0",
      "id": "concept-001",
      "name": [{"lang": "en", "value": "age"}],
      "label": [{"lang": "en", "value": "Age"}],
      "description": [...],
      "definition": [...],
      "subclassOf": {
        "urn": "urn:ddi:example.agency:concept-004:1.0.0",
        "id": "concept-004",
        "name": [...],
        "label": [...]
      },
      "isUniversallyUnique": true
    }
  ]
}
```
Note: Children identifiers are resolved to full objects with all their references recursively resolved. Property names change from `xxxReference` to `xxx` (e.g., `subclassOfReference` → `subclassOf`).

This applies to all schemes:
- **ConceptScheme**: `concepts` array is resolved to full Concept objects
- **VariableScheme**: `variables` array is resolved to full Variable objects
- **CodeListScheme**: `codeLists` array is resolved to full CodeList objects
- **CategoryScheme**: `categories` array is resolved to full Category objects

---

## Filtering Examples

All list endpoints support filtering with query parameters. Here are examples:

### Filter by Agency ID

```bash
# Get all variables from a specific agency
curl "http://localhost:4010/ddi/v1/variables?agencyID=example.agency"

# Get multiple agencies (comma-separated or multiple parameters)
curl "http://localhost:4010/ddi/v1/variables?agencyID=example.agency&agencyID=other.agency"
```

### Filter by Resource ID

```bash
# Get specific variables by ID
curl "http://localhost:4010/ddi/v1/variables?resourceID=var-001"

# Get multiple variables
curl "http://localhost:4010/ddi/v1/variables?resourceID=var-001&resourceID=var-002"
```

### Filter by Version

```bash
# Get variables with specific version
curl "http://localhost:4010/ddi/v1/variables?version=1.0.0"

# Get multiple versions
curl "http://localhost:4010/ddi/v1/variables?version=1.0.0&version=2.0.0"
```

### Filter by URN

```bash
# Get variable by URN
curl "http://localhost:4010/ddi/v1/variables?urn=urn:ddi:example.agency:var-001:1.0.0"
```

### Filter Variables by Concept Reference

```bash
# Get variables that reference a specific concept
curl "http://localhost:4010/ddi/v1/variables?conceptReference=concept-001"

# Or by URN
curl "http://localhost:4010/ddi/v1/variables?conceptReference=urn:ddi:example.agency:concept-001:1.0.0"
```

### Pagination

```bash
# Get first 10 variables (offset 0, limit 10)
curl "http://localhost:4010/ddi/v1/variables?offset=0&limit=10"

# Get next 10 variables
curl "http://localhost:4010/ddi/v1/variables?offset=10&limit=10"

# Get all variables starting from offset 5
curl "http://localhost:4010/ddi/v1/variables?offset=5"
```

### Combined Filters

```bash
# Combine multiple filters
curl "http://localhost:4010/ddi/v1/variables?agencyID=example.agency&version=1.0.0&limit=5"

# Filter by concept and resolve direct references
curl "http://localhost:4010/ddi/v1/variables?conceptReference=concept-001&references=children"

# Filter, paginate, and resolve all references recursively
curl "http://localhost:4010/ddi/v1/variables?agencyID=example.agency&offset=0&limit=10&references=all"
```

### Filter Code Lists

```bash
# Get code lists by agency
curl "http://localhost:4010/ddi/v1/code-lists?agencyID=example.agency"

# Get specific code list by ID
curl "http://localhost:4010/ddi/v1/code-lists?resourceID=codelist-001"

# Get code lists with pagination
curl "http://localhost:4010/ddi/v1/code-lists?offset=0&limit=5"
```

### Filter Concepts

```bash
# Get concepts by agency
curl "http://localhost:4010/ddi/v1/concepts?agencyID=example.agency"

# Get specific concepts by ID
curl "http://localhost:4010/ddi/v1/concepts?conceptID=concept-001&conceptID=concept-002"

# Get concepts with resolved references (children level)
curl "http://localhost:4010/ddi/v1/concepts?agencyID=example.agency&references=children"

# Get concepts with all references resolved recursively
curl "http://localhost:4010/ddi/v1/concepts?agencyID=example.agency&references=all"
```

### Available Filter Parameters

All list endpoints support these query parameters:

- **`urn`**: Filter by URN (exact match)
- **`agencyID`**: Filter by agency ID (supports multiple values)
- **`resourceID`** or **`id`**: Filter by resource ID (supports multiple values)
- **`version`**: Filter by version (supports multiple values)
- **`offset`**: Pagination offset (number)
- **`limit`**: Pagination limit (number)
- **`references`**: Resolve references (enum: `none` (default), `children`, or `all`)

Endpoint-specific filters:

- **Variables**: `variableID`, `conceptReference`, `studyID`, `datasetID`
- **Concepts**: `conceptID`, `conceptSchemeID`
- **Code Lists**: `codeListID`, `codeListSchemeID`
- **Category Schemes**: `categorySchemeID`

## Mock Data Structure

Mock data is stored in `mocks/data/` directory:

```
mocks/
├── data/
│   ├── variables.json              # List of variables
│   ├── variables-var-001.json     # Specific variable
│   ├── concepts.json               # List of concepts
│   ├── concepts-concept-001.json  # Specific concept
│   ├── concept-schemes.json        # List of concept schemes
│   ├── variable-schemes.json       # List of variable schemes
│   ├── code-lists.json            # List of code lists
│   ├── code-list-schemes.json     # List of code list schemes
│   ├── category-schemes.json      # List of category schemes
│   └── categories.json            # List of categories
└── server.js                       # Mock server
```

All mock data includes bilingual content (French and English) with:
- Labels and descriptions in both languages
- Complete DDI structure (URNs, references, representations)
- Realistic examples following DDI standards

### Available Mock Data

**Variables:**
- `var-001`: Age at baseline (numeric)
- `var-002`: Gender (coded)
- `var-003`: Body Mass Index (numeric)

**Concepts:**
- `concept-001`: Age
- `concept-002`: Gender
- `concept-003`: Body Mass Index

**Schemes:**
- `conceptscheme-001`: Demographic Concepts Scheme
- `variablescheme-001`: Baseline Variables Scheme
- `codelistscheme-001`: Demographic Code Lists Scheme
- `categoryscheme-001`: Gender Categories Scheme

**Code Lists:**
- `codelist-001`: Gender codes (M, F, O)

**Categories:**
- `category-001`: Male
- `category-002`: Female
- `category-003`: Other

