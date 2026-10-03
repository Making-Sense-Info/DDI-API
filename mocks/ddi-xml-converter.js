/**
 * DDI XML Converter
 *
 * Converts JSON API responses to DDI-L 3.3 XML following the Making Sense profile
 * (aligned with Mekong conversion `toDOM`).
 */

const builder = require('xmlbuilder');

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

function convertToDDIXML(jsonData) {
  const root = builder.create('g:ResourcePackage', {
    version: '1.0',
    encoding: 'UTF-8'
  });

  Object.keys(DDI_NAMESPACES).forEach(prefix => {
    root.att(`xmlns:${prefix}`, DDI_NAMESPACES[prefix]);
  });
  root.att('xmlns', 'ddi:instance:3_3');

  if (Array.isArray(jsonData)) {
    jsonData.forEach(item => convertObjectToDDI(root, item));
  } else {
    convertObjectToDDI(root, jsonData);
  }

  return root.end({ pretty: true, indent: '   ', newline: '\n' });
}

function urnOf(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.urn || `urn:ddi:${ref.agencyID}:${ref.id}:${ref.version}`;
}

function typeOf(ref, fallback) {
  if (!ref || typeof ref === 'string') return fallback;
  return ref.typeOfObject || ref.type || fallback;
}

function addReference(parent, elementName, ref, defaultType) {
  if (!ref) return;
  const refEle = parent.ele(elementName);
  refEle.ele('r:URN', urnOf(ref));
  refEle.ele('r:TypeOfObject', typeOf(ref, defaultType));
}

function isIdentifierOnly(member) {
  if (typeof member === 'string') return true;
  if (!member || typeof member !== 'object') return true;
  // Full objects carry name and/or label (or representation / codes).
  return Boolean(member.id) && !member.name && !member.label && !member.representation && !member.codes;
}

function appendName(element, elementName, names) {
  if (!names || !Array.isArray(names)) return;
  names.forEach(n => {
    element.ele(elementName)
      .ele('r:String', n.value).att('xml:lang', n.lang);
  });
}

function appendLabel(element, labels) {
  if (!labels || !Array.isArray(labels) || labels.length === 0) return;
  const labelEle = element.ele('r:Label');
  labels.forEach(l => {
    labelEle.ele('r:Content', l.value).att('xml:lang', l.lang);
  });
}

function appendDescription(element, descriptions) {
  if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) return;
  // Mekong: one r:Description with multiple r:Content
  const descEle = element.ele('r:Description');
  descriptions.forEach(d => {
    descEle.ele('r:Content', d.value).att('xml:lang', d.lang);
  });
}

function convertObjectToDDI(parent, obj) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const elementName = getDDIElementName(obj);
  const element = parent.ele(elementName);

  if (obj.isUniversallyUnique === true) {
    element.att('isUniversallyUnique', 'true');
  }

  if (obj.urn) {
    element.ele('r:URN', obj.urn);
  }

  // Optional full identity (Mekong fullIdentity=true): Agency / ID / Version
  if (obj.agencyID) {
    element.ele('r:Agency', obj.agencyID);
  }
  if (obj.id) {
    element.ele('r:ID', obj.id);
  }
  if (obj.version) {
    element.ele('r:Version', obj.version);
  }

  if (obj.userID) {
    element.ele('r:UserID', obj.userID.value).att('typeOfUserID', obj.userID.typeOfUserID);
  }

  // TypeOfVariableGroup before name (Mekong VariableGroup)
  if (elementName === 'l:VariableGroup' && obj.typeOfVariableGroup) {
    element.ele('l:TypeOfVariableGroup', obj.typeOfVariableGroup);
  }

  // Names — scheme types use *SchemeName (Mekong createBase*)
  if (obj.name && Array.isArray(obj.name)) {
    switch (elementName) {
      case 'c:Concept':
        appendName(element, 'c:ConceptName', obj.name);
        break;
      case 'c:ConceptScheme':
        appendName(element, 'c:ConceptSchemeName', obj.name);
        break;
      case 'c:ConceptGroup':
        appendName(element, 'c:ConceptGroupName', obj.name);
        break;
      case 'c:Universe':
        appendName(element, 'c:UniverseName', obj.name);
        break;
      case 'c:UniverseScheme':
        appendName(element, 'c:UniverseSchemeName', obj.name);
        break;
      case 'l:Variable':
        appendName(element, 'l:VariableName', obj.name);
        break;
      case 'l:VariableScheme':
        appendName(element, 'l:VariableSchemeName', obj.name);
        break;
      case 'l:VariableGroup':
        appendName(element, 'l:VariableGroupName', obj.name);
        break;
      case 'l:CodeList':
        appendName(element, 'l:CodeListName', obj.name);
        break;
      case 'l:CodeListScheme':
        appendName(element, 'l:CodeListSchemeName', obj.name);
        break;
      case 'l:CategoryScheme':
        appendName(element, 'l:CategorySchemeName', obj.name);
        break;
      case 's:StudyUnit':
        // StudyUnit uses Citation, not *Name — handled below if citation present
        break;
      default:
        break;
    }
  }

  appendLabel(element, obj.label);
  appendDescription(element, obj.description);

  if (obj.typeOfUnit && elementName === 'c:Universe') {
    element.ele('c:TypeOfUnit', obj.typeOfUnit);
  }

  // Variable: concept / source / basedOn / outParameter
  if (obj.basedOnReference) {
    const basedOn = element.ele('r:BasedOnObject');
    addReference(basedOn, 'r:BasedOnReference', obj.basedOnReference, 'Variable');
  }
  if (obj.outParameter) {
    const out = element.ele('r:OutParameter');
    if (obj.outParameter.isArray !== undefined) {
      out.att('isArray', String(obj.outParameter.isArray));
    }
    if (obj.outParameter.urn) out.ele('r:URN', obj.outParameter.urn);
    if (obj.outParameter.id) out.ele('r:ID', obj.outParameter.id);
  }

  addReference(element, 'r:ConceptReference', obj.conceptReference, 'Concept');
  if (obj.concept) {
    convertObjectToDDI(element, obj.concept);
  }

  addReference(element, 'c:SubclassOfReference', obj.subclassOfReference, 'Concept');
  if (obj.subclassOf) {
    convertObjectToDDI(element, obj.subclassOf);
  }

  addReference(element, 'r:SourceVariableReference', obj.sourceVariableReference, 'Variable');
  if (obj.sourceVariable) {
    convertObjectToDDI(element, obj.sourceVariable);
  }

  addReference(element, 'r:UniverseReference', obj.universeReference, 'Universe');
  addReference(element, 'r:ProcessingInstructionReference', obj.processingInstructionReference, 'GenerationInstruction');
  addReference(element, 'r:MeasurementReference', obj.measurementReference, 'MeasurementItem');

  if (obj.representation) {
    const repEle = element.ele('l:VariableRepresentation');
    convertRepresentation(repEle, obj.representation);
  }

  // CodeList body
  if (elementName === 'l:CodeList') {
    if (obj.recommendedDataType !== undefined) {
      const rdt = element.ele('r:RecommendedDataType', String(obj.recommendedDataType));
      if (obj.recommendedDataTypeControlledVocabularyURN) {
        rdt.att('controlledVocabularyURN', obj.recommendedDataTypeControlledVocabularyURN);
      }
    }
    addReference(element, 'r:CategorySchemeReference', obj.categorySchemeReference, 'CategoryScheme');
    if (obj.categoryScheme) {
      convertObjectToDDI(element, obj.categoryScheme);
    }
    if (obj.codes && Array.isArray(obj.codes)) {
      obj.codes.forEach(code => convertCodeToDDI(element, code));
    }
  }

  // Scheme / group membership
  appendMemberArray(element, obj.concepts, 'c:Concept', 'Concept');
  appendMemberArray(element, obj.variables, 'l:Variable', 'Variable');
  appendMemberArray(element, obj.codeLists, 'l:CodeList', 'CodeList');
  appendMemberArray(element, obj.categories, 'l:Category', 'Category');

  // Groups inside schemes (Mekong: after members)
  if (obj.conceptGroups && Array.isArray(obj.conceptGroups)) {
    obj.conceptGroups.forEach(group => convertObjectToDDI(element, {
      ...group,
      typeOfObject: group.typeOfObject || 'ConceptGroup'
    }));
  }
  if (obj.variableGroups && Array.isArray(obj.variableGroups)) {
    obj.variableGroups.forEach(group => convertObjectToDDI(element, {
      ...group,
      typeOfObject: group.typeOfObject || 'VariableGroup'
    }));
  }

  // Group members as references (Mekong ConceptGroup / VariableGroup)
  if (elementName === 'c:ConceptGroup' && obj.conceptReferences && Array.isArray(obj.conceptReferences)) {
    obj.conceptReferences.forEach(ref => addReference(element, 'r:ConceptReference', ref, 'Concept'));
  }
  if (elementName === 'c:ConceptGroup' && obj.concepts && Array.isArray(obj.concepts)) {
    // Prefer references when members are identifiers; full embed when resolved
    obj.concepts.forEach(member => {
      if (isIdentifierOnly(member)) {
        addReference(element, 'r:ConceptReference', member, 'Concept');
      } else {
        convertObjectToDDI(element, { ...member, typeOfObject: 'Concept' });
      }
    });
  }
  if (elementName === 'l:VariableGroup' && obj.variableReferences && Array.isArray(obj.variableReferences)) {
    obj.variableReferences.forEach(ref => addReference(element, 'r:VariableReference', ref, 'Variable'));
  }
  if (elementName === 'l:VariableGroup' && obj.variables && Array.isArray(obj.variables)) {
    obj.variables.forEach(member => {
      if (isIdentifierOnly(member)) {
        addReference(element, 'r:VariableReference', member, 'Variable');
      } else {
        convertObjectToDDI(element, { ...member, typeOfObject: 'Variable' });
      }
    });
  }

  // Code (standalone path)
  if (elementName === 'l:Code') {
    addReference(element, 'r:CategoryReference', obj.categoryReference, 'Category');
    if (obj.category) {
      convertObjectToDDI(element, obj.category);
    }
    if (obj.value !== undefined) {
      element.ele('r:Value', String(obj.value));
    }
  }

  // StudyUnit citation (minimal)
  if (elementName === 's:StudyUnit' && obj.title) {
    const citation = element.ele('r:Citation');
    const title = citation.ele('r:Title');
    if (Array.isArray(obj.title)) {
      obj.title.forEach(t => title.ele('r:String', t.value).att('xml:lang', t.lang));
    } else {
      title.ele('r:String', String(obj.title));
    }
  }

  return element;
}

function appendMemberArray(element, members, stubElementName, typeName) {
  if (!members || !Array.isArray(members)) return;
  // Skip when parent is a Group that uses reference members (handled separately)
  const parentName = element.name;
  if (parentName === 'c:ConceptGroup' || parentName === 'l:VariableGroup') {
    return;
  }
  members.forEach(member => {
    if (isIdentifierOnly(member)) {
      // Mekong embeds full children in schemes; with Identifier-only JSON we emit a URN stub
      // of the child type (resolved payloads replace this with a full object).
      const stub = element.ele(stubElementName);
      if (member && member.isUniversallyUnique === true) {
        stub.att('isUniversallyUnique', 'true');
      }
      stub.ele('r:URN', urnOf(member));
    } else {
      convertObjectToDDI(element, {
        ...member,
        typeOfObject: member.typeOfObject || member.type || typeName
      });
    }
  });
}

function convertRepresentation(parent, representation) {
  if (!representation) return;

  addReference(parent, 'r:ProcessingInstructionReference', representation.processingInstructionReference, 'GenerationInstruction');

  if (representation.codeRepresentation) {
    const codeRep = parent.ele('r:CodeRepresentation');
    if (representation.codeRepresentation.recommendedDataType !== undefined) {
      codeRep.ele('r:RecommendedDataType', representation.codeRepresentation.recommendedDataType);
    }
    addReference(codeRep, 'r:CodeListReference', representation.codeRepresentation.codeListReference, 'CodeList');
    if (representation.codeRepresentation.codeList) {
      convertObjectToDDI(codeRep, representation.codeRepresentation.codeList);
    }
  }

  if (representation.numericRepresentation) {
    const numRep = parent.ele('r:NumericRepresentation');
    if (representation.numericRepresentation.recommendedDataType !== undefined) {
      numRep.ele('r:RecommendedDataType', representation.numericRepresentation.recommendedDataType);
    }
    if (representation.numericRepresentation.numberRange) {
      const range = representation.numericRepresentation.numberRange;
      const rangeEle = numRep.ele('r:NumberRange');
      if (range.minimum !== undefined) {
        rangeEle.ele('r:Low', String(range.minimum)).att('isInclusive', 'true');
      }
      if (range.maximum !== undefined) {
        rangeEle.ele('r:High', String(range.maximum)).att('isInclusive', 'true');
      }
    }
  }

  if (representation.textRepresentation) {
    const textRep = parent.ele('r:TextRepresentation');
    if (representation.textRepresentation.maxLength !== undefined) {
      textRep.att('maxLength', String(representation.textRepresentation.maxLength));
    }
    if (representation.textRepresentation.recommendedDataType !== undefined) {
      textRep.ele('r:RecommendedDataType', representation.textRepresentation.recommendedDataType);
    }
  }

  const dateTime = representation.dateTimeRepresentation || representation.dateRepresentation;
  if (dateTime) {
    const dateRep = parent.ele('r:DateTimeRepresentation');
    // Mekong typically emits DateTypeCode=Gregorian; RecommendedDataType is optional
    if (dateTime.dateTypeCode !== undefined) {
      dateRep.ele('r:DateTypeCode', dateTime.dateTypeCode);
    } else if (!dateTime.recommendedDataType && !dateTime.format) {
      dateRep.ele('r:DateTypeCode', 'Gregorian');
    }
    if (dateTime.recommendedDataType !== undefined) {
      dateRep.ele('r:RecommendedDataType', dateTime.recommendedDataType);
    }
    if (dateTime.format) {
      dateRep.ele('r:Format', dateTime.format);
    }
  }

  // Managed representation references (Mekong)
  addReference(parent, 'r:NumericRepresentationReference', representation.numericRepresentationReference, 'ManagedNumericRepresentation');
  addReference(parent, 'r:TextRepresentationReference', representation.textRepresentationReference, 'ManagedTextRepresentation');
  addReference(parent, 'r:DateTimeRepresentationReference', representation.dateTimeRepresentationReference, 'ManagedDateTimeRepresentation');
}

function convertCodeToDDI(parent, code) {
  if (!code || typeof code !== 'object') return null;
  return convertObjectToDDI(parent, {
    ...code,
    typeOfObject: code.typeOfObject || code.type || 'Code'
  });
}

function getDDIElementName(obj) {
  if (!obj || typeof obj !== 'object') {
    return 'r:Item';
  }

  const type = obj.typeOfObject || obj.type;
  if (type) {
    switch (type) {
      case 'Variable': return 'l:Variable';
      case 'VariableGroup': return 'l:VariableGroup';
      case 'VariableScheme': return 'l:VariableScheme';
      case 'Concept': return 'c:Concept';
      case 'ConceptGroup': return 'c:ConceptGroup';
      case 'ConceptScheme': return 'c:ConceptScheme';
      case 'CodeList': return 'l:CodeList';
      case 'CodeListScheme': return 'l:CodeListScheme';
      case 'CategoryScheme': return 'l:CategoryScheme';
      case 'Category': return 'l:Category';
      case 'Code': return 'l:Code';
      case 'Universe': return 'c:Universe';
      case 'UniverseScheme': return 'c:UniverseScheme';
      case 'StudyUnit': return 's:StudyUnit';
      case 'PhysicalInstance': return 'pi:PhysicalInstance';
      case 'DataSet': return 'i:DataSet';
      default: break;
    }
  }

  // Structural inference (prefer explicit typeOfObject in mocks)
  if (obj.typeOfVariableGroup !== undefined || obj.variableReferences !== undefined) {
    return 'l:VariableGroup';
  }
  if (obj.conceptReferences !== undefined) {
    return 'c:ConceptGroup';
  }
  if (obj.conceptGroups !== undefined) return 'c:ConceptScheme';
  if (obj.variableGroups !== undefined) return 'l:VariableScheme';
  if (obj.concepts !== undefined) return 'c:ConceptScheme';
  if (obj.variables !== undefined) return 'l:VariableScheme';
  if (obj.codeLists !== undefined) return 'l:CodeListScheme';
  if (obj.categories !== undefined) return 'l:CategoryScheme';
  if (obj.codes !== undefined) return 'l:CodeList';
  if (obj.value !== undefined && (obj.categoryReference !== undefined || obj.category !== undefined)) return 'l:Code';
  if (obj.subclassOfReference !== undefined || obj.subclassOf !== undefined) return 'c:Concept';
  if (obj.representation !== undefined || obj.conceptReference !== undefined || obj.sourceVariableReference !== undefined) {
    return 'l:Variable';
  }
  // Category: label without name
  if (obj.label && !obj.name && !obj.value && !obj.representation) return 'l:Category';
  // Concept vs Variable without representation: prefer Concept (Variables always carry representation in this profile)
  if (obj.name && obj.label && !obj.representation && !obj.codes && !obj.value) {
    return 'c:Concept';
  }

  return 'r:Item';
}

function getRootElementName() {
  return 'g:ResourcePackage';
}

module.exports = {
  convertToDDIXML,
  getRootElementName,
  DDI_NAMESPACES
};
