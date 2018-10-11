import {DeferredType, ThingWithNameAndNamespace, TypeScriptInterfaceProperty} from './types';

/**
 * Translate an OData type to a TypeScript type
 *
 * @param property Property to translate
 */
export function translateProperty(property: TypeScriptInterfaceProperty, deferredType?: DeferredType): string {
  let typeScriptType = '';

  if (property.namespace === 'Edm') {
    switch (property.type) {
      case 'Binary':
      case 'Byte':
      case 'DateTime':
      case 'DateTimeOffset':
      case 'Guid':
      case 'String':
      case 'Time':
        typeScriptType = 'string';
        break;
      case 'Decimal':
      case 'Double':
      case 'Int16':
      case 'Int32':
      case 'Int64':
      case 'Sbyte':
      case 'Single':
        typeScriptType = 'number';
        break;
      case 'Boolean':
        typeScriptType = 'boolean';
        break;
      case 'Null':
        typeScriptType = 'null';
        property.nullable = false;
        break;
      default:
        throw new Error('No translation for ' + property);
    }
  } else {
    typeScriptType = generateName({
      name: property.type,
      namespace: property.namespace,
    });

    if (['*', '0..n', '1..n'].indexOf(property.multiplicity) >= 0) {
      typeScriptType += '[]';
    }

    if (typeof deferredType !== 'undefined') {
      typeScriptType += ' | ' + deferredType + '<' + typeScriptType + '>';
    }
  }

  if (property.nullable) {
    typeScriptType += ' | null';
  }

  return typeScriptType;
}

/**
 * Generate name for a thing
 *
 * @param thing Thing to generate name for
 */
export function generateName(thing: ThingWithNameAndNamespace): string {
  return thing.namespace + '_' + thing.name;
}
