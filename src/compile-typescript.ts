import {generateName} from './helpers';
import {Entity, Property} from './types';

/**
 * Translate an OData type to a TypeScript type
 *
 * @param property Property to translate
 */
export function translateTypeScriptProperty(property: Property): string {
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
  }

  if (property.nullable) {
    typeScriptType += ' | null';
  }

  return typeScriptType;
}

/**
 * Compile entities to TypeScript interfaces
 *
 * @param entities List of entities to compile
 */
export function compileTypeScriptInterfaces(entities: Entity[]): string {
  let output = '/* tslint:disable */\n\n';

  entities.forEach((entity) => {
    output += 'export interface '
      + generateName(entity);

    if (typeof entity.parent !== 'undefined') {
      output += ' extends ' + generateName(entity.parent);
    }

    output += ' {\n';

    entity.properties.forEach((property) => {
      output += '  ' + property.name + ': ' + translateTypeScriptProperty(property) + ';\n';
    });

    output += '}\n\n';
  });

  return output;
}
