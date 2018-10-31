# omeco

This tool can generate a TypeScript definition file containing interfaces that describe data which is parsed from a supplied metadata file.

## Installed globally

```
npm install -g omeco

omeco convert PATH/TO/METADATA.XML
```

This will generate several new files in the same directory as the supplied metadata file.

For further usage refer to the help section of the CLI:

```
omeco --help
```

## Programatically

Use the functions `extractData` and `compileTypeScriptInterfaces`.

[See documentation](https://krlwlfrt.github.io/omeco/) for description of usage.  