import LocateJavaHome from '../index';
import {resolve as resolvePath} from 'path';
import {realpathSync} from 'fs';
import {equal as assertEqual} from 'assert';
import {IJavaHomeInfo} from '../lib/interfaces';
import {spawnSync} from 'child_process';

interface EnvironmentTestOutput {
  path: string;
  version: string;
  security: number;
  is64Bit: boolean;
}

// Path to the CLI
const LJH_BIN = resolvePath(__dirname, '..', '..', '..', 'bin', 'locate-java-home');

let javaHomes: IJavaHomeInfo[];
describe('API Tests', function() {
  it('Finds Java installations with no filter', async () => {
    return new Promise<void>((resolve, reject) => {
      LocateJavaHome((err, found) => {
        assertEqual(!err, true, `An error occurred while finding JAVA_HOME: ${err}`);
        assertEqual(found!.length > 0, true, `No JAVA_HOME found`);
        javaHomes = found!;
        resolve();
      });
    });
  });
  it('Finds JDK', async () => {
    return new Promise<void>((resolve, reject) => {
      LocateJavaHome({ mustBeJDK: true }, (err, found?: Array<IJavaHomeInfo>) => {
        assertEqual(!err, true, `An error occurred while finding JAVA_HOME: ${err}`);
        assertEqual(found!.length > 0, true, `No JAVA_HOME found`);
        resolve();
      });
    });
  });
  it('Found Java installations match data reported by LocateJavaHome', () => {
    for (const javaHome of javaHomes) {
      const java = javaHome.executables.java;
      const etResult = spawnSync(java, ["-classpath", "ts/test/fixtures", "EnvironmentTest"]);
      const envStr = etResult.stdout.toString().trim();
      const envData: EnvironmentTestOutput = JSON.parse(envStr);
      // Java 8 and earlier JDKs report a /jre path for java.home.
      // Java 9 changes that. Java 9 also reports its version as 9.0 rather than 1.9.
      if (javaHome.isJDK && !javaHome.version.startsWith('9')) {
        // Remove /jre from end of path.
        assertEqual(realpathSync(javaHome.path), realpathSync(resolvePath(envData.path, '..')));
      } else {
        assertEqual(realpathSync(javaHome.path), realpathSync(envData.path));
      }
      assertEqual(javaHome.security, envData.security);
      assertEqual(javaHome.is64Bit, envData.is64Bit);
      assertEqual(javaHome.version, envData.version);
    }
  });
  it('Applies a filter correctly', async () => {
    return new Promise<void>((resolve, reject) => {
      const javaHomeZero = javaHomes[0];
      const expectedCount = javaHomes.filter((h) => h.version === javaHomeZero.version).length;
      LocateJavaHome({
        version: `=${javaHomeZero.version}`
      }, (err, found) => {
        if (found) {
          assertEqual(found.length, expectedCount, `Did not find expected count of Java installations with version ${javaHomeZero.version}`);
          resolve();
        } else {
          reject(err);
        }
      });
    });
  });
});

// JAVA_HOME directories found:
describe(`CLI Tests`, () => {
  it('Prints JAVA_HOME information', () => {
    // Note: Need to call Node explicitly on Windows.
    const output = spawnSync('node', [LJH_BIN]);
    const lines = output.stdout.toString().trim().split("\n");
    assertEqual(lines.length, javaHomes.length + 1, `Should print all found JAVA_HOMES`);
    assertEqual(lines.length, new Set(lines).size, `There should be one line of output for each JAVA_HOME found.`);
  });
});
