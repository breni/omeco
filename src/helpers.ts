import {ThingWithNameAndNamespace} from './types';

/**
 * Generate name for a thing
 *
 * @param thing Thing to generate name for
 * @param separator Separator for namespace and name
 */
export function generateName(thing: ThingWithNameAndNamespace, separator: string = '_'): string {
  return thing.namespace + separator + thing.name;
}

/**
 * Check whether something is a string or not
 *
 * @param something Something to check
 */
export function isString(something: any): something is string {
  return typeof something === 'string';
}
