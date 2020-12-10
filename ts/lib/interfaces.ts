export interface ILocateJavaHomeOptions {
  // Semantic versioning string (e.g. ~1.6, >1.6....)
  version?: string;
  // Are you specifically looking for a JDK over a JRE?
  mustBeJDK?: boolean;
  // Are you specifically looking for a JRE over a JDK?
  mustBeJRE?: boolean;
  // Are you looking for a 64-bit JAVA_HOME?
  mustBe64Bit?: boolean;
  // Do you want locate-java-home to exit fatally if one of the found JAVA_HOME
  // locations does not function appropriately? (Mainly useful for debugging.)
  paranoid?: boolean;
}

/**
 * Signature for a platform-specific function for finding JAVA_HOME locations.
 * Invokes the callback with an array of JAVA_HOME locations (empty if none),
 * and (optionally) the executable extension for the given platform, if any
 * (e.g. .exe for Windows).
 */
export interface ILocateJavaHome {
  (): Promise<ILocateJavaHomeResult>
  // (cb: (homes: string[], executableExtension?: string) => void): void;
}

export interface ILocateJavaHomeResult {
  homes: string[],
  executableExtension?: string
}

/**
 * Information about a particular JAVA_HOME location.
 */
export interface IJavaHomeInfo {
  path: string;
  version: string;
  security: number;
  isJDK: boolean;
  is64Bit: boolean;
  executables: {
    java: string;
    // Only defined for JDKs.
    javac?: string;
    javap?: string;
  }
}
