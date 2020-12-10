import {existsSync} from 'fs';
import {resolve as resolvePath} from 'path';
import {exec} from 'child_process';
import {satisfies as semverSatisfies} from 'semver';
import {each as asyncEach} from 'async';
import {ILocateJavaHomeOptions, IJavaHomeInfo, ILocateJavaHome, ILocateJavaHomeResult} from './interfaces';
import Platform from './platform';

const defaultOptions = {
  version: "*",
  mustBeJDK: false,
  mustBeJRE: false,
  paranoid: false,
  mustBe64Bit: false
};

type StandardizedOptions = ILocateJavaHomeOptions & typeof defaultOptions;

/**
 * Return an ILocateJavaHomeOptions object with defaults filled in.
 */
function fillInDefaults(opts: ILocateJavaHomeOptions): StandardizedOptions {
  // semver standardization
  if (opts.version === 'any') {
    opts.version = "*";
  }
  return Object.assign({}, defaultOptions, opts);
}

/**
 * Locates java home.
 *
 * Calls the callback with a matching JAVA_HOME.
 */
function locateJavaHome(cb: (err: Error | null, found?: IJavaHomeInfo[]) => void): void;
function locateJavaHome(options: ILocateJavaHomeOptions, cb: (err: Error | null, found?: IJavaHomeInfo[]) => void): void;
function locateJavaHome(arg1: any, arg2?: (err: Error | null, found?: IJavaHomeInfo[]) => void): void {
  let options: StandardizedOptions = defaultOptions;
  let cb: (err: Error | null, found?: IJavaHomeInfo[]) => void = arg1;
  if (arg2) {
    cb = arg2;
    options = fillInDefaults(arg1);
  }

  // Sanity check
  if (options.mustBeJDK && options.mustBeJRE) {
    return cb(new Error(`Unsatisfiable options: A JAVA_HOME cannot be both a JDK and not a JDK.`), []);
  }

  const locateJavaHome: ILocateJavaHome = Platform(process.platform);
  locateJavaHome().then((res: ILocateJavaHomeResult) => {
    const homeInfos: IJavaHomeInfo[] = [];
    // NOTE: We don't use async.map here because we want to be error tolerant
    // in case some of the JAVA_HOME locations are erroneous.
    asyncEach(res.homes, (home: string, asyncCb: (err?: Error) => void) => {
      getJavaHomeInfo(home, res.executableExtension, (err: Error | null, homeInfo?: IJavaHomeInfo) => {
        if (!err) {
          // Push the info and continue iteration.
          homeInfos.push(homeInfo!);
          asyncCb();
        } else if (options.paranoid) {
          // Report the error, halting iteration.
          asyncCb(err);
        } else {
          // Ignore JAVA_HOME.
          asyncCb();
        }
      });
    }, (err?: Error | null) => {
      var seenPaths: {[path: string]: boolean} = {};
      if (err) {
        cb(err);
      } else {
        cb(null, homeInfos
          .filter((homeInfo) => {
            // Absolute pathify.
            homeInfo.path = resolvePath(homeInfo.path);
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
              // 64-bit constraint
              && (!options.mustBe64Bit || homeInfo.is64Bit)
              // version constraint
              && semverSatisfies(homeInfo.version, options.version);
          }).sort((a, b) => a.path.localeCompare(b.path))
        );
      }
    });
  });
}

/**
 * Get the IJavaHomeInfo object for the given path.
 */
function getJavaHomeInfo(home: string, executableExtension: string | undefined, cb: (err: Error | null, info?: IJavaHomeInfo) => void): void {
  const javaPath = getBinaryPath(home, 'java', executableExtension);
  const javacPath = getBinaryPath(home, 'javac', executableExtension);
  if (!javaPath) {
    return cb(new Error(`Unable to locate 'java' executable in path ${home}`));
  }
  getJavaVersionAndDataModel(javaPath, (err: Error | null, version?: string, security?: number, is64Bit?: boolean) => {
    if (err) {
      cb(err);
    } else {
      let info: IJavaHomeInfo = {
        path: home,
        version: version!,
        security: security!,
        isJDK: javacPath !== null,
        is64Bit: is64Bit!,
        executables: {
          java: javaPath
        }
      };

      if (javacPath) {
        info.executables.javac = javacPath;
        info.executables.javap = getBinaryPath(home, 'javap', executableExtension)!;
      }
      cb(null, info);
    }
  });
}

/**
 * Get the path to a binary in JAVA_HOME. Returns NULL if it does not exist.
 */
function getBinaryPath(home: string, name: string, executableExtension?: string): string | null {
  const binPath = resolvePath(home, 'bin', `${name}${executableExtension ? `.${executableExtension}` : ''}`);
  if (existsSync(binPath)) {
    return binPath;
  }
  return null;
}

/**
 * Given a path to the java executable, get the version of JAVA_HOME.
 */
function getJavaVersionAndDataModel(javaPath: string, cb: (err: Error | null, version?: string, security?: number, is64Bit?: boolean) => void) {
  exec(`"${javaPath}" -version`, function (err: Error | null, stdout: string | Buffer, stderr: string | Buffer) {
    if (err) {
      return cb(err);
    }
    // TODO: Make this more robust to errors.
    const output = stderr.toString();
    const versionData = /(\d+\.\d+\.\d+)(_(\d+))?/.exec(output);
    let version = "0.0.0";
    let security = 0;
    if (versionData !== null) {
      version = versionData[1];
      security = parseInt(versionData[3], 10);
      if (isNaN(security)) {
        security = 0;
      }
    }
    return cb(err, version, security, output.toLowerCase().indexOf("64-bit") !== -1);
  });
}

export default locateJavaHome;
