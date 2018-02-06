# locate-java-home v1.0.0
> Locates `JAVA_HOME` on any platform, and can differentiate between different versions.

## Usage

    npm install locate-java-home

```js
import LocateJavaHome from 'locate-java-home'; // or var ImportJavaHome = require('locate-java-home').default;
LocateJavaHome(function(error, javaHomes) {
   javaHomes.forEach(function(homeInfo) {
      console.log("Found Java " + homeInfo.version + " at " + homeInfo.path);
      if (homeInfo.isJDK) {
        console.log("It's a JDK!");
      }
   });
});

// Limit to JDKs for Java 6 and above.
LocateJavaHome({
    // Uses semver :) Note that Java 6 = Java 1.6, Java 8 = Java 1.8, etc.
    version: ">=1.6",
    mustBeJDK: true
}, function(error, javaHomes) {
    // Done.
});
```

## Motivation

I originally wrote this utility for [DoppioJVM](https://github.com/plamsa-umass/doppio),
which requires access to the Java 8 JDK during build time.

I required the following:

* The ability to check the *version* of `java` in `JAVA_HOME`.
* Verify that `JAVA_HOME` is a JDK and not a JRE.
* Detect a Java 8 JDK *even if it is not the default version of Java installed*.
* Have the above work across Windows, Mac, and Linux.

Since this functionality is likely generally useful, I have decided to release this
as a standalone library! Enjoy! :)


## API

The `locate-java-home` package is a single async function that takes an optional options argument:

```js
LocateJavaHome(options, function(error, javaHomes) {});
LocateJavaHome(function(error, javaHomes) {});
```

`javaHomes` is an array of objects that contain information about each `JAVA_HOME` we found:

```typescript
{
  // Absolute path to JAVA_HOME
  path: string;
  // Version of Java in the JAVA_HOME.
  version: string;
  // True if this JAVA_HOME is a JDK, false if it is a JRE.
  isJDK: boolean;
  // Is this version of Java 64-bit?
  is64Bit: boolean;
  // Paths to various executables.
  executables: {
    java: string;
    // JDK only:
    javac: string;
    javap: string;
  }
}
```

## Options

`locate-java-home` surfaces a number of useful options:

```typescript
{
  // Semantic versioning string (e.g. ~1.6, >1.6....)
  version: string;
  // Are you specifically looking for a JDK over a JRE?
  mustBeJDK: boolean;
  // Are you specifically looking for a JRE over a JDK?
  mustBeJRE: boolean;
  // Are you specifically looking for a 64-bit JAVA_HOME?
  mustBe64Bit: boolean;
  // Do you want locate-java-home to exit fatally if one of the found JAVA_HOME
  // locations does not function appropriately? (Mainly useful for debugging.)
  paranoid: boolean;
}
```

## Global Script

If you install `locate-java-home` globally, you'll have access to the `locate-java-home` command
line tool. Currently, it lists all of the `JAVA_HOME` locations on your system. If there's any
desire to expand it into a full-fledged command line tool that exposes the options of this
library, let me know!
