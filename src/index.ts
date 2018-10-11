import {isString} from 'util';
import {asyncParseString} from './async';
import {generateName, translateProperty} from './helpers';
import {DeferredType, TypeScriptInterface} from './types';

/**
 * Compile representations of TypeScript interfaces to TypeScript code
 *
 * @param typeScriptInterfaces List of TypeScript interfaces to compile
 * @param deferredType Type of deferred to use
 */
export function compileTypeScriptInterfaces(typeScriptInterfaces: TypeScriptInterface[],
                                            deferredType?: DeferredType): string {
  let output = '/* tslint:disable */\n\n';

  typeScriptInterfaces.forEach((typeScriptInterface) => {
    output += 'export interface '
      + generateName(typeScriptInterface);

    if (typeof typeScriptInterface.parent !== 'undefined') {
      output += ' extends ' + generateName(typeScriptInterface.parent);
    }

    output += ' {\n';

    typeScriptInterface.properties.forEach((property: any) => {
      output += '  ' + property.name + ': ' + translateProperty(property, deferredType) + ';\n';
    });

    output += '}\n\n';
  });

  return output;
}

/**
 * Generate TypeScript interfaces from OData metadata
 *
 * @param metadataString Metadata to generate TypeScript interfaces from
 */
export async function extractData(metadataString: string): Promise<TypeScriptInterface[]> {
  const metadata = await asyncParseString(metadataString);

  // get metadata version
  const version = metadata['edmx:Edmx'].$.Version;

  if (version !== '1.0') {
    throw new Error('Metadata version `' + version + '` not supported.');
  }

  return extractDataV2(metadata);
}

/**
 * Generate TypeScript interfaces from OData metadata version 2
 *
 * @param metadata Metadata to generate TypeScript interfaces from
 */
export function extractDataV2(metadata: any): TypeScriptInterface[] {
  const typeScriptInterfaces: TypeScriptInterface[] = [];

  // iterate over data services
  metadata['edmx:Edmx']['edmx:DataServices'].forEach((dataService: any) => {
    // iterate over contained schemas
    dataService.Schema.forEach((schema: any) => {
      if (!Array.isArray(schema.EntityType)) {
        // return if schema doesn't contain any entity types
        return;
      }

      // iterate over entity types
      schema.EntityType.forEach((entityType: any) => {
        // create a new interface
        const typeScriptInterface: TypeScriptInterface = {
          name: entityType.$.Name,
          namespace: schema.$.Namespace,
          properties: [],
        };

        // add interface to list of interfaces
        typeScriptInterfaces.push(typeScriptInterface);

        // set parent for interface if entity type has base type
        if (isString(entityType.$.BaseType)) {
          typeScriptInterface.parent = {
            name: entityType.$.BaseType.split('.')[1],
            namespace: entityType.$.BaseType.split('.')[0],
            properties: [],
          };
        }

        if (Array.isArray(entityType.Property)) {
          // iterate over properties
          entityType.Property.forEach((property: any) => {
            const type = property.$.Type.split('.');

            typeScriptInterface.properties.push({
              multiplicity: '1',
              name: property.$.Name,
              namespace: type[0],
              nullable: property.$.Nullable !== 'false',
              type: type[1],
            });
          });
        }

        // return if schema doesn't contain any navigation properties
        if (!Array.isArray(entityType.NavigationProperty)) {
          return;
        }

        entityType.NavigationProperty.forEach((navigationProperty: any) => {
          const associationName = navigationProperty.$.Relationship.split('.')[1];
          let relevantAssociation: any = null;
          let relevantEnd: any = null;

          schema.Association.forEach((association: any) => {
            if (associationName === association.$.Name) {
              relevantAssociation = association;
            }
          });

          if (relevantAssociation === null) {
            throw new Error('Relevant association not found!');
          }

          relevantAssociation.End.forEach((end: any) => {
            if (end.$.Role === navigationProperty.$.ToRole) {
              relevantEnd = end;
            }
          });

          if (relevantEnd === null) {
            throw new Error('Relevant end not found!');
          }

          typeScriptInterface.properties.push({
            multiplicity: relevantEnd.$.Multiplicity,
            name: navigationProperty.$.Name,
            namespace: schema.$.Namespace,
            nullable: false,
            type: relevantEnd.$.Type.split('.')[1],
          });
        });
      });
    });
  });

  return typeScriptInterfaces;
}
