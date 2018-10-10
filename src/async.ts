import {readFile, writeFile} from 'fs';
import {promisify} from 'util';
import {convertableToString, parseString} from 'xml2js';

/**
 * Async version of readFile
 */
export const asyncReadFile = promisify(readFile);
/**
 * Async version of writeFile
 */
export const asyncWriteFile = promisify(writeFile);

/**
 * Async version of parseString
 *
 * @param xml XML to parse
 */
export function asyncParseString(xml: convertableToString): Promise<any> {
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
