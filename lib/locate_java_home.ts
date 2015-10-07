/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/semver/semver.d.ts" />
/// <reference path="../typings/async/async.d.ts" />
import path = require('path');
import fs = require('fs');
import child_process = require('child_process');
import semver = require('semver');
import async = require('async');
import interfaces = require('./interfaces');
import ILocateJavaHomeOptions = interfaces.ILocateJavaHomeOptions;
import IJavaHomeInfo = interfaces.IJavaHomeInfo;
var exec = child_process.exec;

var defaultOptions: ILocateJavaHomeOptions = {
  version: "*",
  mustBeJDK: false,
  mustBeJRE: false,
  paranoid: false
};

/**
 * Return an ILocateJavaHomeOptions object with defaults filled in.
 */
function fillInDefaults(opts: ILocateJavaHomeOptions): ILocateJavaHomeOptions {
  function getProp(prop: string) {
    if (opts.hasOwnProperty(prop)) {
      return (<any> opts)[prop];
    }
    return (<any> defaultOptions)[prop];
  }

  // semver standardization
  if (opts.version === 'any') {
    opts.version = "*";
  }

  return {
    version: getProp('version'),
    mustBeJDK: getProp('mustBeJDK'),
    mustBeJRE: getProp('mustBeJRE'),
    paranoid: getProp('paranoid')
  };
}

/**
 * Locates java home.
 *
 * Calls the callback with a matching JAVA_HOME.
 */
function locateJavaHome(cb: (err: Error, found: string[]) => void): void;
function locateJavaHome(options: ILocateJavaHomeOptions, cb: (err: Error, found: string[]) => void): void;
function locateJavaHome(arg1: any, arg2?: (err: Error, found: string[]) => void): void {
  var options: ILocateJavaHomeOptions = defaultOptions,
    cb = arg1;
  if (arg2) {
    cb = arg2;
    options = fillInDefaults(arg1);
  }

  // Sanity check
  if (options.mustBeJDK && options.mustBeJRE) {
    return cb(new Error(`Unsatisfiable options: A JAVA_HOME cannot be both a JDK and not a JDK.`), []);
  }

  var locateJavaHome: interfaces.ILocateJavaHome;
  try {
    locateJavaHome = require(`.${path.sep}platforms${path.sep}${process.platform}`);
  } catch (e) {
    throw new Error(`Error: locate-java-home does not support the platform ${process.platform}.
Please file a bug at https://github.com/jvilk/locate-java-home and we can see what we can do about that. :)`);
  }

  locateJavaHome((homes: string[], executableExtension?: string) => {
    var homeInfos: IJavaHomeInfo[] = [];
    // NOTE: We don't use async.map here because we want to be error tolerant
    // in case some of the JAVA_HOME locations are erroneous.
    async.each(homes, (home: string, asyncCb: (err?: Error) => void) => {
      getJavaHomeInfo(home, executableExtension, (err: Error, homeInfo?: IJavaHomeInfo) => {
        if (!err) {
          // Push the info and continue iteration.
          homeInfos.push(homeInfo);
          asyncCb();
        } else if (options.paranoid) {
          // Report the error, halting iteration.
          asyncCb(err);
        } else {
          // Ignore JAVA_HOME.
          asyncCb();
        }
      });
    }, (err?: Error) => {
      var seenPaths: {[path: string]: boolean} = {};
      if (err) {
        cb(err);
      } else {
        cb(null, homeInfos
          .filter((homeInfo) => {
            // Absolute pathify.
            homeInfo.path = path.resolve(homeInfo.path);
            // Filter redundant paths.
            if (seenPaths[homeInfo.path]) {
              return false;
            } else {
              seenPaths[homeInfo.path] = true;
            }

            // JDK constraint
            return (!options.mustBeJDK || homeInfo.isJDK)
              // JRE constraint
              && (!options.mustBeJRE || !homeInfo.isJDK)
              // version constraint
              && semver.satisfies(homeInfo.version, options.version);
          }).sort((a, b) => a.path.localeCompare(b.path))
        );
      }
    });
  });
}

/**
 * Get the IJavaHomeInfo object for the given path.
 */
function getJavaHomeInfo(home: string, executableExtension: string, cb: (err: Error, info?: interfaces.IJavaHomeInfo) => void): void {
  var javaPath = getBinaryPath(home, 'java', executableExtension),
    javacPath = getBinaryPath(home, 'javac', executableExtension),
    info: IJavaHomeInfo;
  getJavaVersion(javaPath, (err: Error, version?: string) => {
    if (err) {
      cb(err);
    } else {
      info = {
        path: home,
        version: version,
        isJDK: javacPath !== null,
        executables: {
          java: javaPath
        }
      };

      if (info.isJDK) {
        info.executables.javac = javacPath;
        info.executables.javap = getBinaryPath(home, 'javap', executableExtension);
      }
      cb(null, info);
    }
  });
}

/**
 * Get the path to a binary in JAVA_HOME. Returns NULL if it does not exist.
 */
function getBinaryPath(home: string, name: string, executableExtension?: string): string {
  var binPath = path.resolve(home, 'bin', `${name}${executableExtension ? `.${executableExtension}` : ''}`);
  if (fs.existsSync(binPath)) {
    return binPath;
  }
  return null;
}

/**
 * Given a path to the java executable, get the version of JAVA_HOME.
 */
function getJavaVersion(javaPath: string, cb: (err: Error, version?: string) => void) {
  exec(`${javaPath} -version`, function (err: Error, stdout: Buffer, stderr: Buffer) {
    if (err) {
      return cb(err);
    }
    // TODO: Make this more robust to errors.
    return cb(err, /(\d+\.\d+\.\d+)/.exec(stderr.toString())[1]);
  });
}

export = locateJavaHome;
