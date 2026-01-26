/**
 * DDI XML Converter
 * 
 * Converts JSON API responses to DDI 3.3 compliant XML format.
 * Based on the DDI structure from Constances-DDI-groupings.xml example.
 */

const builder = require('xmlbuilder');

// DDI 3.3 Namespaces
const DDI_NAMESPACES = {
  'c': 'ddi:conceptualcomponent:3_3',
  'd': 'ddi:datacollection:3_3',
  'g': 'ddi:group:3_3',
  'i': 'ddi:instance:3_3',
  'l': 'ddi:logicalproduct:3_3',
  'pi': 'ddi:physicalinstance:3_3',
  'r': 'ddi:reusable:3_3',
  's': 'ddi:studyunit:3_3'
};

/**
 * Convert a JSON object to DDI XML structure
 */
function convertToDDIXML(jsonData, rootElementName) {
  const root = builder.create('g:ResourcePackage', {
    version: '1.0',
    encoding: 'UTF-8'
  });

  // Add namespaces
  Object.keys(DDI_NAMESPACES).forEach(prefix => {
    root.att(`xmlns:${prefix}`, DDI_NAMESPACES[prefix]);
  });
  root.att('xmlns', 'ddi:instance:3_3');

  if (Array.isArray(jsonData)) {
    // Array of resources - add each directly to root
    jsonData.forEach(item => {
      convertObjectToDDI(root, item);
    });
  } else {
    // Single resource - add directly to root
    convertObjectToDDI(root, jsonData);
  }

  return root.end({ pretty: true, indent: '   ', newline: '\n' });
}

/**
 * Convert a single JSON object to DDI XML element and add it to parent
 */
function convertObjectToDDI(parent, obj) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const elementName = getDDIElementName(obj);
  const element = parent.ele(elementName);

  // Handle isUniversallyUnique attribute
  if (obj.isUniversallyUnique === true) {
    element.att('isUniversallyUnique', 'true');
  }

  // Handle URN
  if (obj.urn) {
    element.ele('r:URN', obj.urn);
  }

  // Handle UserID
  if (obj.userID) {
    element.ele('r:UserID', obj.userID.value).att('typeOfUserID', obj.userID.typeOfUserID);
  }

  // Handle name (for Concepts, ConceptSchemes, Variables, VariableSchemes, CodeLists)
  if (obj.name && Array.isArray(obj.name)) {
    if (elementName === 'c:Concept' || elementName === 'c:ConceptScheme') {
      obj.name.forEach(n => {
        element.ele('c:ConceptName')
          .ele('r:String', n.value).att('xml:lang', n.lang);
      });
    } else if (elementName === 'l:Variable' || elementName === 'l:VariableScheme') {
      obj.name.forEach(n => {
        element.ele('l:VariableName')
          .ele('r:String', n.value).att('xml:lang', n.lang);
      });
    } else if (elementName === 'd:CodeList' || elementName === 'd:CodeListScheme') {
      obj.name.forEach(n => {
        element.ele('d:CodeListName')
          .ele('r:String', n.value).att('xml:lang', n.lang);
      });
    }
  }

  // Handle label
  if (obj.label && Array.isArray(obj.label)) {
    const labelEle = element.ele('r:Label');
    obj.label.forEach(l => {
      labelEle.ele('r:Content', l.value).att('xml:lang', l.lang);
    });
  }

  // Handle description
  if (obj.description && Array.isArray(obj.description)) {
    obj.description.forEach(d => {
      element.ele('r:Description')
        .ele('r:Content', d.value).att('xml:lang', d.lang);
    });
  }

  // Handle definition (for Concepts)
  if (obj.definition && Array.isArray(obj.definition)) {
    obj.definition.forEach(d => {
      element.ele('c:Definition')
        .ele('r:Content', d.value).att('xml:lang', d.lang);
    });
  }

  // Handle conceptReference
  if (obj.conceptReference) {
    const refEle = element.ele('c:ConceptReference');
    refEle.ele('r:URN', obj.conceptReference.urn || `urn:ddi:${obj.conceptReference.agencyID}:${obj.conceptReference.id}:${obj.conceptReference.version}`);
    refEle.ele('r:TypeOfObject', obj.conceptReference.typeOfObject || obj.conceptReference.type);
  }

  // Handle concept (when resolved)
  if (obj.concept) {
    convertObjectToDDI(element, obj.concept);
  }

  // Handle subclassOfReference
  if (obj.subclassOfReference) {
    const refEle = element.ele('c:SubclassOfReference');
    refEle.ele('r:URN', obj.subclassOfReference.urn || `urn:ddi:${obj.subclassOfReference.agencyID}:${obj.subclassOfReference.id}:${obj.subclassOfReference.version}`);
    refEle.ele('r:TypeOfObject', obj.subclassOfReference.typeOfObject || obj.subclassOfReference.type);
  }

  // Handle subclassOf (when resolved)
  if (obj.subclassOf) {
    convertObjectToDDI(element, obj.subclassOf);
  }

  // Handle representation (for Variables)
  if (obj.representation) {
    const repEle = element.ele('l:Representation');
    convertRepresentation(repEle, obj.representation);
  }

  // Handle sourceVariableReference
  if (obj.sourceVariableReference) {
    const refEle = element.ele('l:SourceVariableReference');
    refEle.ele('r:URN', obj.sourceVariableReference.urn || `urn:ddi:${obj.sourceVariableReference.agencyID}:${obj.sourceVariableReference.id}:${obj.sourceVariableReference.version}`);
    refEle.ele('r:TypeOfObject', obj.sourceVariableReference.typeOfObject || obj.sourceVariableReference.type);
  }

  // Handle sourceVariable (when resolved)
  if (obj.sourceVariable) {
    convertObjectToDDI(element, obj.sourceVariable);
  }

  // Handle concepts array (for ConceptScheme)
  if (obj.concepts && Array.isArray(obj.concepts)) {
    obj.concepts.forEach(concept => {
      if (typeof concept === 'string' || (concept.id && !concept.name)) {
        // It's an identifier reference
        const conceptRef = element.ele('c:Concept');
        if (concept.isUniversallyUnique === true) {
          conceptRef.att('isUniversallyUnique', 'true');
        }
        conceptRef.ele('r:URN', concept.urn || `urn:ddi:${concept.agencyID}:${concept.id}:${concept.version}`);
      } else {
        // It's a full Concept object
        convertObjectToDDI(element, concept);
      }
    });
  }

  // Handle variables array (for VariableScheme)
  if (obj.variables && Array.isArray(obj.variables)) {
    obj.variables.forEach(variable => {
      if (typeof variable === 'string' || (variable.id && !variable.name)) {
        // It's an identifier reference
        const varRef = element.ele('l:Variable');
        if (variable.isUniversallyUnique === true) {
          varRef.att('isUniversallyUnique', 'true');
        }
        varRef.ele('r:URN', variable.urn || `urn:ddi:${variable.agencyID}:${variable.id}:${variable.version}`);
      } else {
        // It's a full Variable object
        convertObjectToDDI(element, variable);
      }
    });
  }

  // Handle codeLists array (for CodeListScheme)
  if (obj.codeLists && Array.isArray(obj.codeLists)) {
    obj.codeLists.forEach(codeList => {
      if (typeof codeList === 'string' || (codeList.id && !codeList.name)) {
        // It's an identifier reference
        const codeListRef = element.ele('d:CodeList');
        if (codeList.isUniversallyUnique === true) {
          codeListRef.att('isUniversallyUnique', 'true');
        }
        codeListRef.ele('r:URN', codeList.urn || `urn:ddi:${codeList.agencyID}:${codeList.id}:${codeList.version}`);
      } else {
        // It's a full CodeList object
        convertObjectToDDI(element, codeList);
      }
    });
  }

  // Handle categories array (for CategoryScheme)
  if (obj.categories && Array.isArray(obj.categories)) {
    obj.categories.forEach(category => {
      if (typeof category === 'string' || (category.id && !category.label)) {
        // It's an identifier reference
        const catRef = element.ele('l:Category');
        if (category.isUniversallyUnique === true) {
          catRef.att('isUniversallyUnique', 'true');
        }
        catRef.ele('r:URN', category.urn || `urn:ddi:${category.agencyID}:${category.id}:${category.version}`);
      } else {
        // It's a full Category object
        convertObjectToDDI(element, category);
      }
    });
  }

  // Handle codes array (for CodeList)
  if (obj.codes && Array.isArray(obj.codes)) {
    obj.codes.forEach(code => {
      convertCodeToDDI(element, code);
    });
  }

  // Handle categorySchemeReference (for CodeList)
  if (obj.categorySchemeReference) {
    const refEle = element.ele('d:CategorySchemeReference');
    refEle.ele('r:URN', obj.categorySchemeReference.urn || `urn:ddi:${obj.categorySchemeReference.agencyID}:${obj.categorySchemeReference.id}:${obj.categorySchemeReference.version}`);
    refEle.ele('r:TypeOfObject', obj.categorySchemeReference.typeOfObject || obj.categorySchemeReference.type);
  }

  // Handle categoryScheme (when resolved)
  if (obj.categoryScheme) {
    convertObjectToDDI(element, obj.categoryScheme);
  }

  // Handle categoryReference (for Code)
  if (obj.categoryReference) {
    const refEle = element.ele('d:CategoryReference');
    refEle.ele('r:URN', obj.categoryReference.urn || `urn:ddi:${obj.categoryReference.agencyID}:${obj.categoryReference.id}:${obj.categoryReference.version}`);
    refEle.ele('r:TypeOfObject', obj.categoryReference.typeOfObject || obj.categoryReference.type);
  }

  // Handle category (when resolved)
  if (obj.category) {
    convertObjectToDDI(element, obj.category);
  }

  // Handle value (for Code)
  if (obj.value !== undefined) {
    element.ele('d:Value', String(obj.value));
  }

  return element;
}

/**
 * Convert representation object to DDI XML
 */
function convertRepresentation(parent, representation) {
  if (!representation) return;

  if (representation.codeRepresentation) {
    const codeRep = parent.ele('l:CodeRepresentation');
    codeRep.ele('l:RecommendedDataType', representation.codeRepresentation.recommendedDataType);
    
    if (representation.codeRepresentation.codeListReference) {
      const refEle = codeRep.ele('l:CodeListReference');
      refEle.ele('r:URN', representation.codeRepresentation.codeListReference.urn || 
        `urn:ddi:${representation.codeRepresentation.codeListReference.agencyID}:${representation.codeRepresentation.codeListReference.id}:${representation.codeRepresentation.codeListReference.version}`);
      refEle.ele('r:TypeOfObject', representation.codeRepresentation.codeListReference.typeOfObject || representation.codeRepresentation.codeListReference.type);
    }
    
    if (representation.codeRepresentation.codeList) {
      convertObjectToDDI(codeRep, representation.codeRepresentation.codeList);
    }
  }

  if (representation.numericRepresentation) {
    const numRep = parent.ele('l:NumericRepresentation');
    numRep.ele('l:RecommendedDataType', representation.numericRepresentation.recommendedDataType);
    
    if (representation.numericRepresentation.format) {
      numRep.ele('l:Format', representation.numericRepresentation.format);
    }
  }

  if (representation.textRepresentation) {
    const textRep = parent.ele('l:TextRepresentation');
    textRep.ele('l:RecommendedDataType', representation.textRepresentation.recommendedDataType);
    
    if (representation.textRepresentation.maxLength !== undefined) {
      textRep.ele('l:MaxLength', String(representation.textRepresentation.maxLength));
    }
  }

  if (representation.dateRepresentation) {
    const dateRep = parent.ele('l:DateRepresentation');
    dateRep.ele('l:RecommendedDataType', representation.dateRepresentation.recommendedDataType);
    
    if (representation.dateRepresentation.format) {
      dateRep.ele('l:Format', representation.dateRepresentation.format);
    }
  }
}

/**
 * Convert a Code object to DDI XML
 */
function convertCodeToDDI(parent, code) {
  return convertObjectToDDI(parent, code);
}

/**
 * Get the DDI XML element name for a JSON object
 */
function getDDIElementName(obj) {
  if (!obj || typeof obj !== 'object') {
    return 'r:Item';
  }

  // Check for typeOfObject first
  if (obj.typeOfObject || obj.type) {
    const type = obj.typeOfObject || obj.type;
    switch (type) {
      case 'Variable':
        return 'l:Variable';
      case 'Concept':
        return 'c:Concept';
      case 'ConceptScheme':
        return 'c:ConceptScheme';
      case 'VariableScheme':
        return 'l:VariableScheme';
      case 'CodeList':
        return 'd:CodeList';
      case 'CodeListScheme':
        return 'd:CodeListScheme';
      case 'CategoryScheme':
        return 'l:CategoryScheme';
      case 'Category':
        return 'l:Category';
      case 'Code':
        return 'd:Code';
      default:
        return 'r:Item';
    }
  }

  // Infer from structure
  if (obj.concepts !== undefined) return 'c:ConceptScheme';
  if (obj.variables !== undefined) return 'l:VariableScheme';
  if (obj.codeLists !== undefined) return 'd:CodeListScheme';
  if (obj.categories !== undefined) return 'l:CategoryScheme';
  if (obj.codes !== undefined) return 'd:CodeList';
  if (obj.value !== undefined && (obj.categoryReference !== undefined || obj.category !== undefined)) return 'd:Code';
  if (obj.definition !== undefined || obj.subclassOfReference !== undefined || obj.subclassOf !== undefined) return 'c:Concept';
  if (obj.representation !== undefined) return 'l:Variable';
  if (obj.label && !obj.name && !obj.value && !obj.definition && !obj.representation) return 'l:Category';
  // If it has name and label but no other identifying features, check if it looks like a Variable
  if (obj.name && obj.label && !obj.definition && !obj.value && !obj.codes) {
    // Could be Variable or Concept - default to Variable if no other indicators
    return 'l:Variable';
  }

  return 'r:Item';
}

/**
 * Get root element name based on resource type
 */
function getRootElementName(data, resourceType) {
  // Always wrap in ResourcePackage for DDI compliance
  return 'g:ResourcePackage';
}

module.exports = {
  convertToDDIXML,
  getRootElementName,
  DDI_NAMESPACES
};
