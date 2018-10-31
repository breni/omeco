import {asyncParseString} from './async';
import {isString} from './helpers';
import {Entity} from './types';

/**
 * Extract entities and their properties from OData metadata
 *
 * @param metadataString Metadata to extract entities from
 */
export async function extractData(metadataString: string): Promise<Entity[]> {
  const metadata = await asyncParseString(metadataString);

  // get metadata version
  const version = metadata['edmx:Edmx'].$.Version;

  if (version !== '1.0') {
    throw new Error('Metadata version `' + version + '` not supported.');
  }

  return extractDataV2(metadata);
}

/**
 * Extract entities from OData metadata version 2
 *
 * @param metadata Metadata to extract entities from
 */
export function extractDataV2(metadata: any): Entity[] {
  const entities: Entity[] = [];

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
        const entity: Entity = {
          name: entityType.$.Name,
          namespace: schema.$.Namespace,
          properties: [],
        };

        // add interface to list of interfaces
        entities.push(entity);

        // set parent for interface if entity type has base type
        if (isString(entityType.$.BaseType)) {
          entity.parent = {
            name: entityType.$.BaseType.split('.')[1],
            namespace: entityType.$.BaseType.split('.')[0],
            properties: [],
          };
        }

        if (Array.isArray(entityType.Property)) {
          // iterate over properties
          entityType.Property.forEach((property: any) => {
            const type = property.$.Type.split('.');

            entity.properties.push({
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

          entity.properties.push({
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

  return entities;
}
