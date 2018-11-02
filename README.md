# omeco

This tool can extract data from an OData metadata file and compile it to other representations of the extracted data. Currently these are:

* TypeScript interfaces
* PlantUML and a resulting class diagram

## CLI

Install and execute `omeco` globally and use it as a CLI.

```shell
npm install -g omeco

omeco convert PATH/TO/METADATA.XML
```

This will generate output files in the same directory as the supplied metadata file with names which match the basename (without extension) of the source file.

For further usage refer to the help section of the CLI:

```shell
omeco --help
```

## Programatically

Install `omeco` as a dependency in your project and use it programatically.

```shell
npm install omeco
```

### Extract

Use `extractData` to extract data from a metadata description.

### Compile

* Use `compileTypeScriptInterfaces` to generate TypeScript interfaces from the extracted data.
* Use `compilePlantUml` to generate PlantUML from the extracted data.
* Use `writePlantUmlPng` to write a class diagram (PNG) from generated PlantUML. 

## Documentation

[See documentation](https://krlwlfrt.github.io/omeco/) for detailed description of usage. 