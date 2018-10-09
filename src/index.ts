import {readFile, writeFile} from 'fs';
import {isString, promisify} from 'util';
import {convertableToString, parseString} from 'xml2js';

/**
 * A structure representing a TypeScript interface
 */
export interface TypeScriptInterface {
  /**
   * Name of the interface
   */
  name: string;

  /**
   * Namespace of the interface
   */
  namespace: string;

  /**
   * Parent interface of the interface
   */
  parent?: string;

  /**
   * List of properties of the interface
   */
  properties: TypeScriptInterfaceProperty[];
}

/**
 * A TypeScript interface property
 */
export interface TypeScriptInterfaceProperty {
  /**
   * Name of the property
   */
  name: string;

  /**
   * Type of the property
   */
  type: string;
}

/**
 * Async version of readFile
 */
export const asyncReadFile = promisify(readFile);
/**
 * Async version of writeFile
 */
export const asyncWriteFile = promisify(writeFile);

/**
 * Async version of parseString
 *
 * @param xml XML to parse
 */
export function asyncParseString(xml: convertableToString): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, (err: any, result: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Translate an OData type to a TypeScript type
 *
 * @param oDataType OData type to translate
 * @param nullable Whether or not the type shall be nullable
 */
export function translateType(oDataType: string, nullable: boolean): string {
  let typeScriptType = '';

  switch (oDataType) {
    case 'Edm.Binary':
    case 'Edm.Byte':
    case 'Edm.DateTime':
    case 'Edm.DateTimeOffset':
    case 'Edm.Guid':
    case 'Edm.String':
    case 'Edm.Time':
      typeScriptType = 'string';
      break;
    case 'Edm.Decimal':
    case 'Edm.Double':
    case 'Edm.Int16':
    case 'Edm.Int32':
    case 'Edm.Int64':
    case 'Edm.Sbyte':
    case 'Edm.Single':
      typeScriptType = 'number';
      break;
    case 'Edm.Boolean':
      typeScriptType = 'boolean';
      break;
    case 'Null':
      typeScriptType = 'null';
      nullable = false;
      break;
    default:
      throw new Error('No translation for ' + oDataType);
  }

  if (nullable) {
    typeScriptType += ' | null';
  }

  return typeScriptType;
}

/**
 * Generate name from namespace and name
 *
 * @param namespace Namespace to generate name from
 * @param name Name to generate name from
 */
export function generateName(namespace: string, name: string): string {
  return namespace + '_' + name;
}

/**
 * Compile representations of TypeScript interfaces to TypeScript code
 *
 * @param typeScriptInterfaces List of TypeScript interfaces to compile
 */
export function compileTypeScriptInterfaces(typeScriptInterfaces: TypeScriptInterface[]): string {
  let output = '/* tslint:disable */\n\n';

  typeScriptInterfaces.forEach((typeScriptInterface) => {
    output += 'export interface ' + generateName(typeScriptInterface.namespace, typeScriptInterface.name);

    if (typeof typeScriptInterface.parent === 'string') {
      output += ' extends ' + generateName(typeScriptInterface.namespace, typeScriptInterface.parent);
    }

    output += ' {\n';

    typeScriptInterface.properties.forEach((property: any) => {
      output += '  ' + property.name + ': ' + property.type + ';\n';
    });

    output += '}\n\n';
  });

  return output;
}

/**
 * Generate TypeScript interfaces from OData metadata
 *
 * @param metadata Metadata to generate TypeScript interfaces from
 */
export function generateTypeScriptInterfaces(metadata: any): TypeScriptInterface[] {
  // get metadata version
  const version = metadata['edmx:Edmx'].$.Version;

  if (version !== '1.0') {
    throw new Error('Metadata version `' + version + '` not supported.');
  }

  return generateTypeScriptInterfacesV2(metadata);
}

/**
 * Generate TypeScript interfaces from OData metadata version 2
 *
 * @param metadata Metadata to generate TypeScript interfaces from
 */
export function generateTypeScriptInterfacesV2(metadata: any): TypeScriptInterface[] {
  const typeScriptInterfaces: TypeScriptInterface[] = [];

  metadata['edmx:Edmx']['edmx:DataServices'].forEach((dataService: any) => {
    dataService.Schema.forEach((schema: any) => {
      if (!Array.isArray(schema.EntityType)) {
        return;
      }

      schema.EntityType.forEach((entityType: any) => {
        const typeScriptInterface: TypeScriptInterface = {
          name: entityType.$.Name,
          namespace: schema.$.Namespace,
          properties: [],
        };

        if (isString(entityType.$.BaseType)) {
          typeScriptInterface.parent = entityType.$.BaseType.split('.')[1];
        }

        if (Array.isArray(entityType.Property)) {
          entityType.Property.forEach((property: any) => {
            typeScriptInterface.properties.push({
              name: property.$.Name,
              // property `Nullable` defaults to true
              type: translateType(property.$.Type, property.$.Nullable !== 'false'),
            });
          });
        }

        typeScriptInterfaces.push(typeScriptInterface);
      });

      schema.Association.forEach((association: any) => {
        if (!Array.isArray(association.ReferentialConstraint)) {
          return;
          // TODO: associations with equal nodes
        }

        const principalRole = association
          .ReferentialConstraint[0]
          .Principal[0]
          .$
          .Role;
        const dependentRole = association.ReferentialConstraint[0].Dependent[0].$.Role;

        let principal: any = {};
        let dependent: any = {};

        association.End.forEach((end: any) => {
          if (end.$.Role === principalRole) {
            principal = end.$;
          }

          if (end.$.Role === dependentRole) {
            dependent = end.$;
          }
        });

        [principal.namespace, principal.name] = principal.Type.split('.');
        [dependent.namespace, dependent.name] = dependent.Type.split('.');

        typeScriptInterfaces.forEach((typeScriptInterface) => {
          if (typeScriptInterface.namespace === principal.namespace
            && typeScriptInterface.name === principal.name) {
            const property = {
              name: association.$.Name,
              type: generateName(dependent.namespace, dependent.name),
            };

            if (dependent.Multiplicity === '*') {
              property.type += '[]';
            }

            property.type += ' | Promise<' + property.type + '>';

            typeScriptInterface.properties.push(property);
          }
        });
      });
    });
  });

  return typeScriptInterfaces;
}
