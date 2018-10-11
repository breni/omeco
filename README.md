# odata-metadata-to-typescript-interfaces

This tool can generate a TypeScript definition file containing interfaces that describe data which is parsed from a supplied metadata file.

## Installed globally

```
npm install -g odata-metadata-to-typescript-interfaces

omtti convert PATH/TO/METADATA.XML
```

This will generate a file called `metadata.d.ts` in the same directory as the supplied metadata file.

For further usage refer to the help section of the CLI:

```
omtti --help
```

## Programatically

Use the functions `extractData` and `compileTypeScriptInterfaces`.

[See documentation](https://krlwlfrt.github.io/odata-metadata-to-typescript-interfaces/) for description of usage.  