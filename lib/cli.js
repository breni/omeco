"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander = require("commander");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const xml2js_1 = require("xml2js");
const pkgJson = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, '..', 'package.json')).toString());
/**
 * Async version of readFile
 */
const asyncReadFile = util_1.promisify(fs_1.readFile);
/**
 * Async version of writeFile
 */
const asyncWriteFile = util_1.promisify(fs_1.writeFile);
/**
 * Async version of parseString
 *
 * @param xml XML to parse
 */
function asyncParseString(xml) {
    return new Promise((resolve, reject) => {
        xml2js_1.parseString(xml, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
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
function translateType(oDataType, nullable) {
    let typeScriptType = '';
    switch (oDataType) {
        case 'Edm.String':
        case 'Edm.Binary':
            typeScriptType = 'string';
            break;
        case 'Edm.Int32':
            typeScriptType = 'number';
            break;
        case 'Edm.DateTime':
            typeScriptType = 'Date';
            break;
        case 'Edm.Boolean':
            typeScriptType = 'boolean';
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
function generateName(namespace, name) {
    return namespace + '_' + name;
}
commander
    .command('convert <metadataXml> <interfacesDTs>')
    .version(pkgJson.version)
    .description('Convert OData metadata to TypeScript interfaces')
    .action((metadataXml, interfacesDTs) => __awaiter(this, void 0, void 0, function* () {
    if (!fs_1.existsSync(metadataXml)) {
        throw new Error('File `' + metadataXml + '` does not exist!');
    }
    if (fs_1.existsSync(interfacesDTs)) {
        throw new Error('File `' + interfacesDTs + '` does exist!');
    }
    const buffer = yield asyncReadFile(metadataXml);
    const metadata = yield asyncParseString(buffer);
    const typeScriptInterfaces = [];
    metadata['edmx:Edmx']['edmx:DataServices'].forEach((dataService) => {
        dataService.Schema.forEach((schema) => {
            schema.EntityType.forEach((entityType) => {
                const typeScriptInterface = {
                    name: entityType.$.Name,
                    namespace: schema.$.Namespace,
                    properties: [],
                };
                entityType.Property.forEach((property) => {
                    typeScriptInterface.properties.push({
                        name: property.$.Name,
                        type: translateType(property.$.Type, property.$.Nullable),
                    });
                });
                typeScriptInterfaces.push(typeScriptInterface);
            });
            schema.Association.forEach((association) => {
                const principalRole = association.ReferentialConstraint[0].Principal[0].$.Role;
                const dependentRole = association.ReferentialConstraint[0].Dependent[0].$.Role;
                let principal = {};
                let dependent = {};
                association.End.forEach((end) => {
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
        typeScriptInterface.properties.forEach((property) => {
            output += '  ' + property.name + ': ' + property.type + ';\n';
        });
        output += '}\n\n';
    });
    yield asyncWriteFile(interfacesDTs, output);
}));
commander
    .parse(process.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6Ii4vc3JjLyIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSx1Q0FBdUM7QUFDdkMsMkJBQWlFO0FBQ2pFLCtCQUEwQjtBQUMxQiwrQkFBK0I7QUFDL0IsbUNBQXdEO0FBRXhELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQVksQ0FBQyxXQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFFM0Y7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBRyxnQkFBUyxDQUFDLGFBQVEsQ0FBQyxDQUFDO0FBRTFDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQUcsZ0JBQVMsQ0FBQyxjQUFTLENBQUMsQ0FBQztBQUU1Qzs7OztHQUlHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxHQUF3QjtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLG9CQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBUSxFQUFFLE1BQVcsRUFBRSxFQUFFO1lBQ3pDLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNiO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNqQjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxTQUFpQixFQUFFLFFBQWlCO0lBQ3pELElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztJQUV4QixRQUFRLFNBQVMsRUFBRTtRQUNqQixLQUFLLFlBQVksQ0FBQztRQUNsQixLQUFLLFlBQVk7WUFDZixjQUFjLEdBQUcsUUFBUSxDQUFDO1lBQzFCLE1BQU07UUFDUixLQUFLLFdB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