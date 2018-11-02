import {createWriteStream} from 'fs';
import {generateName} from './helpers';
import {Entity} from './types';

/**
 * Compile entities to a PlantUML description
 *
 * @param entities List of entities to compile
 */
export function compilePlantUml(entities: Entity[]): string {
  let output = '@startuml\nset namespaceSeparator ::\n\n';

  let extensions = '';

  let associations = '';

  entities.forEach((typeScriptInterface) => {
    output += `class ${generateName(typeScriptInterface, '::')} {\n`;

    if (typeof typeScriptInterface.parent !== 'undefined') {
      extensions += `${generateName(typeScriptInterface.parent, '::')}`
        + ` <|-- ${generateName(typeScriptInterface, '::')}\n`;
    }

    typeScriptInterface.properties.forEach((property) => {
      if (property.namespace === 'Edm') {
        output += `  ${property.name}:${property.type}\n`;
      } else {
        output += `  #${property.name}\n`;

        associations += `${generateName(typeScriptInterface, '::')}::${property.name}`
          + ` "1" --> "${property.multiplicity}" ${generateName({
            name: property.type,
            namespace: property.namespace,
          }, '::')} : ${property.name}\n`;
      }
    });

    output += '}\n';
  });

  if (extensions.length > 0) {
    output += `\n\n${extensions}`;
  }

  if (associations.length > 0) {
    output += `\n\n${associations}`;
  }

  output += '\n@enduml';

  return output;
}

/**
 * Write class diagram file (PNG) from PlantUML file
 *
 * @param sourceFile Source file to read PlantUML from
 * @param targetFile Target file to write class diagram (PNG)
 */
export function writePlantUmlPng(sourceFile: string, targetFile: string): void {
  const plantuml = require('node-plantuml');
  const gen = plantuml.generate(sourceFile);
  gen.out.pipe(createWriteStream(targetFile));
}
