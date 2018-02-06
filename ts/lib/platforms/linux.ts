import {exec} from 'child_process';
import {resolve as resolvePath, dirname} from 'path';
import {readlinkSync} from 'fs';

/**
 * Find Java in Linux using three methods:
 * - `update-java-alternatives`,
 * - the JAVA_HOME environment variable
 * - Java on the PATH.
 */
export default function linuxFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
  const discoveredJavaHomes: string[] = [];
  // Option 1: Try the 'update-java-alternatives' tool
  exec('update-java-alternatives -l', (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) => {
    // This returns error code 1 on success, for some reason.
    if (!err || (<any>err).code == 1) {
      const alts = stdout.toString().trim().split('\n');
      for (const alt of alts) {
        // "java-1.7.0-openjdk-amd64 1071 /usr/lib/jvm/java-1.7.0-openjdk-amd64"
        discoveredJavaHomes.push(alt.split(' ')[2]);
      }
    }
    // Option 2: Is JAVA_HOME defined?
    // (NOTE: locate_java_home will prune redundancies.)
    if (process.env.JAVA_HOME) {
      discoveredJavaHomes.push(process.env.JAVA_HOME!);
    }

    // Option 3: Can we invoke binary directly?
    function findByBinary(binaryName: string, newCb: () => any) {
      exec(`${binaryName} -version`, function (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) {
        if (err) {
          // Nope. Return what we have.
          cb(discoveredJavaHomes);
        } else {
          // Find JAVA_HOME for Java.
          exec(`which ${binaryName}`, function (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) {
            if (!err) {
              let javaPath = stdout.toString().trim();
              // Trace path through symlinks
              try {
                while (1) {
                  // Some symlinks are relative. .resolve is a NOP for absolute paths.
                  javaPath = resolvePath(dirname(javaPath), readlinkSync(javaPath));
                }
              } catch (e) {
                // We reached the end of the link chain.
              }
              // JAVA_HOME/bin/java => JAVA_HOME
              discoveredJavaHomes.push(resolvePath(javaPath, "..", ".."));
            }
            newCb();
          });
        }
      });
    }
    // Find JRE location
    findByBinary('java', function () {
      // Find JDK location, can be different
      findByBinary('javac', function () {
        cb(discoveredJavaHomes);
      });
    });
  });
}
