/**
 * A thing with a name and a namespace
 */
export interface ThingWithNameAndNamespace {
  /**
   * Name of the thing
   */
  name: string;

  /**
   * Namespace of the thing
   */
  namespace: string;
}

/**
 * A structure representing a TypeScript interface
 */
export interface TypeScriptInterface extends ThingWithNameAndNamespace {
  /**
   * Parent interface of the interface
   */
  parent?: TypeScriptInterface;

  /**
   * List of properties of the interface
   */
  properties: TypeScriptInterfaceProperty[];
}

/**
 * A TypeScript interface property
 */
export interface TypeScriptInterfaceProperty extends ThingWithNameAndNamespace {
  /**
   * Multiplicity of the property
   */
  multiplicity: string;

  /**
   * Whether or not this property is nullable
   */
  nullable: boolean;

  /**
   * Type of the property
   */
  type: string;
}

export type DeferredType = 'JQuery.Deferred' | 'Promise';
