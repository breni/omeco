#!/usr/bin/env node

import * as commander from 'commander';
import {createWriteStream, existsSync, readFileSync} from 'fs';
import {basename, dirname, join} from 'path';
import {asyncReadFile, asyncWriteFile} from './async';
import {compilePlantUml} from './compile-plantuml';
import {compileTypeScriptInterfaces} from './compile-typescript';
import {extractData} from './extract';

// read and parse package file
const pkgJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString());

commander
  .version(pkgJson.version) // set version of cli
  .allowUnknownOption(false); // disallow unknown options

commander
  .command('convert <metadataXml> [targetDir]')
  .description('OData metadata converter')
  .option('-f, --force', 'Whether or not to overwrite existing files in target directory')
  .option('-s, --sort', 'Whether or not to sort entities and properties by name')
  .action(async (metadataXml, targetDir, cmd) => {
    // check if supplied metadata file exists
    if (!existsSync(metadataXml)) {
      throw new Error('File `' + metadataXml + '` does not exist!');
    }

    // set default value for targetDir
    if (typeof targetDir === 'undefined') {
      targetDir = dirname(metadataXml);
    }

    // set target file name
    const targetFileName = join(targetDir, basename(metadataXml, '.xml'));

    // check if files in target directory exist
    [
      '.d.ts',
      '.puml',
      '.png',
    ].forEach((extension) => {
      const existingFile = targetFileName + extension;
      if (existsSync(existingFile) && !cmd.force) {
        throw new Error(`File ${existingFile} does exist!`);
      }
    });

    // read metadata file
    const buffer = await asyncReadFile(metadataXml);

    // extract data
    const extractedData = await extractData(buffer.toString());

    // sort entities and properties by name
    if (cmd.sort) {
      extractedData.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      extractedData.forEach((entity) => {
        entity.properties.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      });
    }

    // generate and compile TypeScript interfaces
    await asyncWriteFile(targetFileName + '.d.ts', compileTypeScriptInterfaces(extractedData));

    // generate and compile PlantUML description
    await asyncWriteFile(targetFileName + '.puml', compilePlantUml(extractedData));

    // generate PNG fromn PlantUML
    const plantuml = require('node-plantuml');
    const gen = plantuml.generate(targetFileName + '.puml');
    gen.out.pipe(createWriteStream(targetFileName + '.png'));
  });

commander
  .parse(process.argv);

if (commander.args.length < 1) {
  commander.help();
}
