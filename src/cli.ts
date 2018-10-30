#!/usr/bin/env node

import * as commander from 'commander';
import {existsSync, readFileSync} from 'fs';
import {basename, dirname, join} from 'path';
import {asyncParseString, asyncReadFile, asyncWriteFile} from './async';
import {compileTypeScriptInterfaces, extractData} from './index';

// read and parse package file
const pkgJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString());

// set version of cli
commander.version(pkgJson.version);

commander
  .command('convert <metadataXml> [interfacesDTs]')
  .description('Convert OData metadata to TypeScript interfaces')
  .option('-d, --debug', 'Write JSON representation of XML to file')
  .option('-f, --force', 'Overwrite existing TypeScript definition file')
  .option('-l, --deferred [type]', 'Type of deferred to use')
  .option('-s, --sort', 'Whether or not to sort interfaces and properties')
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

    // write JSON representation of metadata if debug option is set
    if (cmd.debug) {
      // parse metadata file
      const metadata = await asyncParseString(buffer);

      await asyncWriteFile(join(
        dirname(metadataXml),
        basename(metadataXml, '.xml') + '.json',
      ), JSON.stringify(metadata, null, 2));
    }

    // extract data
    const extractedData = await extractData(buffer.toString());

    if (cmd.sort) {
      extractedData.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      extractedData.forEach((typeScriptInterface) => {
        typeScriptInterface.properties.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      });
    }

    // determine deferred type
    const deferredType = ['JQuery.Deferred', 'Promise'].indexOf(cmd.deferred) >= 0 ? cmd.deferred : undefined;

    // generate and compile TypeScript interfaces
    await asyncWriteFile(interfacesDTs, compileTypeScriptInterfaces(extractedData, deferredType));
  });

commander
  .parse(process.argv);

if (commander.args.length < 1) {
  commander.help();
}
