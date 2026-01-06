#!/usr/bin/env node

/**
 * DDI API Mock Server
 * 
 * Serves mock data for the DDI REST API.
 * Uses Prism for dynamic mock generation from OpenAPI spec,
 * with fallback to static JSON files for specific examples.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4010;
const MOCKS_DIR = path.join(__dirname, 'data');
const SPEC_PATH = path.join(__dirname, '..', 'ddi-rest.yaml');

app.use(cors());
app.use(express.json());

// Helper to load JSON file
function loadMock(fileName) {
  const filePath = path.join(MOCKS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

// Helper to find item by ID or URN
function findById(data, id) {
  if (!data || !Array.isArray(data)) return null;
  return data.find(item => 
    item.id === id || 
    item.urn === id ||
    item.urn === `urn:ddi:example.agency:${id}:1.0.0`
  );
}

// Helper to filter data by query parameters
function filterData(data, query) {
  if (!data || !Array.isArray(data)) return data;
  
  let filtered = [...data];
  
  // Filter by URN
  if (query.urn) {
    filtered = filtered.filter(item => item.urn === query.urn);
  }
  
  // Filter by agencyID
  if (query.agencyID) {
    const agencyIDs = Array.isArray(query.agencyID) ? query.agencyID : [query.agencyID];
    filtered = filtered.filter(item => agencyIDs.includes(item.agencyID));
  }
  
  // Filter by resourceID (id)
  if (query.resourceID || query.id) {
    const ids = Array.isArray(query.resourceID || query.id) 
      ? (query.resourceID || query.id) 
      : [query.resourceID || query.id];
    filtered = filtered.filter(item => ids.includes(item.id));
  }
  
  // Filter by version
  if (query.version) {
    const versions = Array.isArray(query.version) ? query.version : [query.version];
    filtered = filtered.filter(item => versions.includes(item.version));
  }
  
  // Filter by variableID (for variables list)
  if (query.variableID) {
    const ids = Array.isArray(query.variableID) ? query.variableID : [query.variableID];
    filtered = filtered.filter(item => {
      const itemId = item.id || extractId({ id: item.id, urn: item.urn });
      return ids.some(id => itemId === id || itemId === extractId({ id, urn: id }));
    });
  }
  
  // Filter by conceptID (for concepts list)
  if (query.conceptID) {
    const ids = Array.isArray(query.conceptID) ? query.conceptID : [query.conceptID];
    filtered = filtered.filter(item => {
      const itemId = item.id || extractId({ id: item.id, urn: item.urn });
      return ids.some(id => itemId === id || itemId === extractId({ id, urn: id }));
    });
  }
  
  // Filter by conceptReference (for variables)
  if (query.conceptReference) {
    const refs = Array.isArray(query.conceptReference) ? query.conceptReference : [query.conceptReference];
    filtered = filtered.filter(item => {
      if (!item.conceptReference) return false;
      const itemRefId = extractId(item.conceptReference);
      return refs.some(ref => {
        const refId = extractId({ id: ref, urn: ref });
        return itemRefId === refId;
      });
    });
  }
  
  // Pagination
  const offset = parseInt(query.offset) || 0;
  const limit = query.limit ? parseInt(query.limit) : undefined;
  
  if (limit !== undefined) {
    filtered = filtered.slice(offset, offset + limit);
  } else if (offset > 0) {
    filtered = filtered.slice(offset);
  }
  
  return filtered;
}

// Helper to extract ID from URN or use direct ID
function extractId(ref) {
  if (!ref) return null;
  if (ref.id) return ref.id;
  if (ref.urn) {
    // URN format: urn:ddi:example.agency:concept-001:1.0.0
    // Extract the ID part (4th segment)
    const parts = ref.urn.split(':');
    if (parts.length >= 4) {
      return parts[3];
    }
  }
  return null;
}

// Helper to get the mock data file for a given type
function getMockDataForType(typeOfObject) {
  const typeMap = {
    'Concept': 'concepts.json',
    'Variable': 'variables.json',
    'ConceptScheme': 'concept-schemes.json',
    'VariableScheme': 'variable-schemes.json',
    'CodeList': 'code-lists.json',
    'CodeListScheme': 'code-list-schemes.json',
    'CategoryScheme': 'category-schemes.json',
    'Category': 'categories.json'
  };
  return typeMap[typeOfObject] || null;
}

// Helper to get the type for a scheme's children array
function getTypeForSchemeChildren(propertyName) {
  const typeMap = {
    'concepts': 'Concept',
    'variables': 'Variable',
    'codeLists': 'CodeList',
    'categories': 'Category'
  };
  return typeMap[propertyName] || null;
}

// Helper to check if an object looks like an identifier (has urn/id/agencyID/version but no typeOfObject)
function isIdentifier(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (obj.urn || obj.id) && !obj.typeOfObject && !obj.type;
}

// Helper to get the property name for a resolved reference
// e.g., "conceptReference" -> "concept", "codeListReference" -> "codeList"
// Special case: "subclassOfReference" -> "subclassOf"
function getResolvedPropertyName(refPropertyName) {
  // Special cases
  if (refPropertyName === 'subclassOfReference') {
    return 'subclassOf';
  }
  
  // Handle SchemeReference first (check if it contains SchemeReference before Reference)
  // e.g., "conceptSchemeReference" -> "conceptScheme"
  // e.g., "categorySchemeReference" -> "categoryScheme"
  if (refPropertyName.includes('SchemeReference')) {
    return refPropertyName.replace('SchemeReference', 'Scheme');
  }
  
  // Handle regular Reference suffix
  // e.g., "conceptReference" -> "concept"
  if (refPropertyName.endsWith('Reference')) {
    return refPropertyName.slice(0, -9); // Remove "Reference" suffix
  }
  
  return refPropertyName;
}

// Helper to resolve a single reference
function resolveSingleReference(ref, level, isRecursive, currentDepth = 0) {
  if (!ref || typeof ref !== 'object') return ref;
  
  const refId = extractId(ref);
  if (!refId) return ref;
  
  const typeOfObject = ref.typeOfObject || ref.type;
  if (!typeOfObject) return ref;
  
  const mockFile = getMockDataForType(typeOfObject);
  if (!mockFile) return ref;
  
  const data = loadMock(mockFile);
  const resolvedObj = findById(data, refId);
  
  if (resolvedObj) {
    // If recursive, resolve all references in the resolved object
    // Pass currentDepth + 1 to continue recursive resolution
    return isRecursive ? resolveReferences(resolvedObj, level, currentDepth + 1) : resolvedObj;
  }
  
  return ref;
}

// Helper to resolve references in an object (truly recursive and generic)
// level: 'none' (default), 'children' (first level only), 'all' (recursive)
// startDepth: starting depth for recursive processing (used internally)
function resolveReferences(obj, level, startDepth = 0) {
  if (!level || level === 'none' || !obj || typeof obj !== 'object') return obj;
  
  const resolved = JSON.parse(JSON.stringify(obj)); // Deep clone
  const isRecursive = level === 'all';
  
  // Helper to check if a property is a reference
  function isReferenceProperty(key, value) {
    if (!value || typeof value !== 'object') return false;
    // Check if it looks like a reference (has typeOfObject or type, or ends with Reference)
    // Skip SchemeReference properties as children don't reference their schemes
    if (key.endsWith('SchemeReference')) return false;
    return (value.typeOfObject || value.type || key.endsWith('Reference'));
  }
  
  // Recursively process object properties
  function processObject(objToProcess, depth = 0) {
    if (!objToProcess || typeof objToProcess !== 'object') return objToProcess;
    
    // Special handling for arrays
    if (Array.isArray(objToProcess)) {
      return objToProcess.map(item => processObject(item, depth));
    }
    
    const processed = {};
    
    for (const [key, value] of Object.entries(objToProcess)) {
      // Skip certain properties that shouldn't be processed
      if (key === 'urn' || key === 'id' || key === 'agencyID' || key === 'version' || key === 'typeOfObject' || key === 'type') {
        processed[key] = value;
        continue;
      }
      
      // Handle reference properties
      if (isReferenceProperty(key, value)) {
        // For 'children' level: resolve only at depth 0
        // For 'all' level: resolve at all depths (truly recursive)
        if (depth === 0 || isRecursive) {
          const resolved = resolveSingleReference(value, level, isRecursive, depth);
          // Replace xxxReference with xxx when resolved
          const resolvedKey = getResolvedPropertyName(key);
          processed[resolvedKey] = resolved;
          // Don't include the original Reference property when resolved
        } else {
          processed[key] = value; // Keep as reference for 'children' level at depth > 0
        }
      }
      // Special handling for nested paths (e.g., representation.codeRepresentation.codeListReference)
      else if (key === 'representation' && value?.codeRepresentation?.codeListReference) {
        const codeListRef = value.codeRepresentation.codeListReference;
        if (depth === 0 || isRecursive) {
          const resolved = resolveSingleReference(codeListRef, level, isRecursive, depth);
          // Create a new codeRepresentation object without codeListReference
          const { codeListReference, ...codeRepresentationWithoutRef } = value.codeRepresentation;
          processed[key] = {
            ...value,
            codeRepresentation: {
              ...codeRepresentationWithoutRef,
              codeList: resolved // Replace codeListReference with codeList
            }
          };
        } else {
          processed[key] = {
            ...value,
            codeRepresentation: {
              ...value.codeRepresentation,
              codeListReference: codeListRef
            }
          };
        }
      }
      // Handle arrays that might contain references (e.g., codes in codeList)
      else if (Array.isArray(value)) {
        // Special handling for codes in codeList
        if (key === 'codes' && depth === 0) {
          // For codes, resolve categoryReference at children level
          processed[key] = value.map(code => {
            if (code.categoryReference) {
              const categoryId = extractId(code.categoryReference);
              if (categoryId) {
                const categories = loadMock('categories.json');
                const category = findById(categories, categoryId);
                if (category) {
                  const resolvedCategory = isRecursive ? resolveReferences(category, level, depth + 1) : category;
                  // Exclude categoryReference when resolving to category
                  const { categoryReference, ...codeWithoutRef } = code;
                  return {
                    ...codeWithoutRef,
                    category: resolvedCategory // Replace categoryReference with category
                  };
                }
              }
            }
            return isRecursive ? processObject(code, depth + 1) : code;
          });
        }
        // Special handling for scheme children (concepts, variables, codeLists, categories)
        // These are arrays of identifiers that should be resolved when references != 'none'
        else if (getTypeForSchemeChildren(key)) {
          const childType = getTypeForSchemeChildren(key);
          const mockFile = getMockDataForType(childType);
          if (mockFile) {
            const allChildren = loadMock(mockFile);
            processed[key] = value.map(identifier => {
              if (isIdentifier(identifier)) {
                const childId = identifier.id || extractId(identifier);
                if (childId) {
                  const child = findById(allChildren, childId);
                  if (child) {
                    // Resolve the child object
                    // For 'children' level: resolve object but not its internal references
                    // For 'all' level: resolve recursively with all references
                    if (isRecursive) {
                      return resolveReferences(child, level, depth + 1);
                    } else {
                      // For 'children' level, return the full object but don't resolve its internal references
                      return child;
                    }
                  }
                }
              }
              // If not an identifier or not found, process as normal
              return processObject(identifier, depth + 1);
            });
          } else {
            processed[key] = value.map(item => processObject(item, depth + 1));
          }
        } else {
          processed[key] = value.map(item => processObject(item, depth + 1));
        }
      }
      // Recursively process nested objects
      else if (value && typeof value === 'object') {
        processed[key] = processObject(value, depth + 1);
      }
      // Keep primitive values as-is
      else {
        processed[key] = value;
      }
    }
    
    return processed;
  }
  
  return processObject(resolved, startDepth);
}

// Variables endpoints
app.get('/ddi/v1/variables', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('variables.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/variables/:variableID', (req, res) => {
  const { variableID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('variables.json');
  const variable = findById(data, variableID);
  if (variable) {
    const resolved = resolveReferences(variable, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Variable not found' });
  }
});

// Concepts endpoints
app.get('/ddi/v1/concepts', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('concepts.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/concepts/:conceptID', (req, res) => {
  const { conceptID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('concepts.json');
  const concept = findById(data, conceptID);
  if (concept) {
    const resolved = resolveReferences(concept, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Concept not found' });
  }
});

// Concept Schemes endpoints
app.get('/ddi/v1/concept-schemes', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('concept-schemes.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/concept-schemes/:conceptSchemeID', (req, res) => {
  const { conceptSchemeID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('concept-schemes.json');
  const scheme = findById(data, conceptSchemeID);
  if (scheme) {
    const resolved = resolveReferences(scheme, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Concept scheme not found' });
  }
});

// Variable Schemes endpoints
app.get('/ddi/v1/variable-schemes', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('variable-schemes.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/variable-schemes/:variableSchemeID', (req, res) => {
  const { variableSchemeID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('variable-schemes.json');
  const scheme = findById(data, variableSchemeID);
  if (scheme) {
    const resolved = resolveReferences(scheme, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Variable scheme not found' });
  }
});

// Code Lists endpoints
app.get('/ddi/v1/code-lists', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('code-lists.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/code-lists/:codeListID', (req, res) => {
  const { codeListID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('code-lists.json');
  const codeList = findById(data, codeListID);
  if (codeList) {
    const resolved = resolveReferences(codeList, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Code list not found' });
  }
});

// Code List Schemes endpoints
app.get('/ddi/v1/code-list-schemes', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('code-list-schemes.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/code-list-schemes/:codeListSchemeID', (req, res) => {
  const { codeListSchemeID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('code-list-schemes.json');
  const scheme = findById(data, codeListSchemeID);
  if (scheme) {
    const resolved = resolveReferences(scheme, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Code list scheme not found' });
  }
});

// Category Schemes endpoints
app.get('/ddi/v1/category-schemes', (req, res) => {
  const references = req.query.references || 'none';
  let data = loadMock('category-schemes.json');
  
  // Apply filters
  data = filterData(data, req.query);
  
  // Resolve references if requested
  if (data && references !== 'none') {
    const resolved = data.map(item => resolveReferences(item, references));
    res.json(resolved);
  } else {
    res.json(data || []);
  }
});

app.get('/ddi/v1/category-schemes/:categorySchemeID', (req, res) => {
  const { categorySchemeID } = req.params;
  const references = req.query.references || 'none';
  const data = loadMock('category-schemes.json');
  const scheme = findById(data, categorySchemeID);
  if (scheme) {
    const resolved = resolveReferences(scheme, references);
    res.json(resolved);
  } else {
    res.status(404).json({ error: 'Category scheme not found' });
  }
});

// Health check endpoint (for Render and other services to prevent sleep)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'DDI API Mock Server',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint (also for health checks)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'DDI API Mock Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      variables: {
        list: '/ddi/v1/variables',
        item: '/ddi/v1/variables/{variableID}'
      },
      concepts: {
        list: '/ddi/v1/concepts',
        item: '/ddi/v1/concepts/{conceptID}'
      },
      conceptSchemes: {
        list: '/ddi/v1/concept-schemes',
        item: '/ddi/v1/concept-schemes/{conceptSchemeID}'
      },
      variableSchemes: {
        list: '/ddi/v1/variable-schemes',
        item: '/ddi/v1/variable-schemes/{variableSchemeID}'
      },
      codeLists: {
        list: '/ddi/v1/code-lists',
        item: '/ddi/v1/code-lists/{codeListID}'
      },
      codeListSchemes: {
        list: '/ddi/v1/code-list-schemes',
        item: '/ddi/v1/code-list-schemes/{codeListSchemeID}'
      },
      categorySchemes: {
        list: '/ddi/v1/category-schemes',
        item: '/ddi/v1/category-schemes/{categorySchemeID}'
      }
    },
    documentation: {
      swaggerUI: 'https://nicolaval.github.io/DDI-API/',
      endpoints: 'https://github.com/NicoLaval/DDI-API/blob/main/MOCK_API_ENDPOINTS.md',
      deployment: 'https://github.com/NicoLaval/DDI-API/blob/main/MOCK_API_DEPLOYMENT.md'
    },
    queryParameters: {
      references: {
        description: 'Control how referenced objects are returned',
        values: ['none', 'children', 'all'],
        default: 'none'
      },
      filtering: {
        description: 'Filter resources by various criteria',
        supported: ['urn', 'agencyID', 'resourceID', 'version', 'offset', 'limit']
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 DDI API Mock Server running on http://localhost:${PORT}`);
  console.log(`📄 Serving mock data from: ${MOCKS_DIR}`);
  console.log(`📋 OpenAPI spec: ${SPEC_PATH}`);
});

