#!/usr/bin/env node

import * as commander from 'commander';
import {existsSync, readFileSync} from 'fs';
import {basename, dirname, join} from 'path';
import {
  asyncParseString,
  asyncReadFile,
  asyncWriteFile,
  compileTypeScriptInterfaces,
  generateTypeScriptInterfaces,
} from './index';

// read and parse package file
const pkgJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString());

commander
  .command('convert <metadataXml> [interfacesDTs]')
  .version(pkgJson.version)
  .description('Convert OData metadata to TypeScript interfaces')
  .option('-d, --debug', 'Write JSON representation of XML to file')
  .option('-f, --force', 'Overwrite existing TypeScript definition file')
  .action(async (metadataXml, interfacesDTs, cmd) => {
    // check if supplied metadata file exists
    if (!existsSync(metadataXml)) {
      throw new Error('File `' + metadataXml + '` does not exist!');
    }

    // set default value for TypeScript definition file
    if (typeof interfacesDTs === 'undefined') {
      interfacesDTs = join(dirname(metadataXml), basename(metadataXml, '.xml') + '.d.ts');
    }

    // fail if TypeScript definition file exists and force option is not set
    if (existsSync(interfacesDTs) && !cmd.force) {
      throw new Error('File `' + interfacesDTs + '` does exist!');
    }

    // read metadata file
    const buffer = await asyncReadFile(metadataXml);

    // parse metadata file
    const metadata = await asyncParseString(buffer);

    // write JSON representation of metadata if debug option is set
    if (cmd.debug) {
      await asyncWriteFile(join(
        dirname(metadataXml),
        basename(metadataXml, '.xml') + '.json',
      ), JSON.stringify(metadata, null, 2));
    }

    // generate and compile TypeScript interfaces
    await asyncWriteFile(interfacesDTs, compileTypeScriptInterfaces(generateTypeScriptInterfaces(metadata)));
  });

commander
  .parse(process.argv);
