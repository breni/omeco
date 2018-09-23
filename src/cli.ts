#!/usr/bin/env node

import * as commander from 'commander';
import {existsSync, readFile, readFileSync, writeFile} from 'fs';
import {basename, dirname, join} from 'path';
import {promisify} from 'util';
import {convertableToString, parseString} from 'xml2js';

const pkgJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString());

/**
 * Async version of readFile
 */
const asyncReadFile = promisify(readFile);

/**
 * Async version of writeFile
 */
const asyncWriteFile = promisify(writeFile);

/**
 * Async version of parseString
 *
 * @param xml XML to parse
 */
function asyncParseString(xml: convertableToString): Promise<any> {
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
function translateType(oDataType: string, nullable: boolean): string {
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
function generateName(namespace: string, name: string): string {
  return namespace + '_' + name;
}

commander
  .command('convert <metadataXml> [interfacesDTs]')
  .version(pkgJson.version)
  .description('Convert OData metadata to TypeScript interfaces')
  .option('-d, --debug', 'Write JSON representation of XML to file')
  .action(async (metadataXml, interfacesDTs, cmd) => {
    if (!existsSync(metadataXml)) {
      throw new Error('File `' + metadataXml + '` does not exist!');
    }

    if (typeof interfacesDTs === 'undefined') {
      interfacesDTs = join(dirname(metadataXml), basename(metadataXml, '.xml') + '.d.ts');
    }

    if (existsSync(interfacesDTs)) {
      throw new Error('File `' + interfacesDTs + '` does exist!');
    }

    const buffer = await asyncReadFile(metadataXml);

    const metadata = await asyncParseString(buffer);

    if (cmd.debug) {
      await asyncWriteFile(join(
        dirname(metadataXml),
        basename(metadataXml, '.xml') + '.json',
      ), JSON.stringify(metadata, null, 2));
    }

    const typeScriptInterfaces: any[] = [];

    metadata['edmx:Edmx']['edmx:DataServices'].forEach((dataService: any) => {
      dataService.Schema.forEach((schema: any) => {
        if (!Array.isArray(schema.EntityType)) {
          return;
        }

        schema.EntityType.forEach((entityType: any) => {
          const typeScriptInterface: any = {
            name: entityType.$.Name,
            namespace: schema.$.Namespace,
            properties: [],
          };

          entityType.Property.forEach((property: any) => {
            typeScriptInterface.properties.push({
              name: property.$.Name,
              type: translateType(property.$.Type, property.$.Nullable),
            });
          });

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

    let output = '';
    typeScriptInterfaces.forEach((typeScriptInterface) => {
      output += 'export interface ' + generateName(typeScriptInterface.namespace, typeScriptInterface.name) + ' {\n';

      typeScriptInterface.properties.forEach((property: any) => {
        output += '  ' + property.name + ': ' + property.type + ';\n';
      });

      output += '}\n\n';
    });

    await asyncWriteFile(interfacesDTs, output);
  });

commander
  .parse(process.argv);
