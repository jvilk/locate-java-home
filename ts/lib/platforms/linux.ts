import child_process = require('child_process');
import fs = require('fs');
import path = require('path');
var exec = child_process.exec;

/**
 * Find Java in Linux using three methods:
 * - `update-java-alternatives`,
 * - the JAVA_HOME environment variable
 * - Java on the PATH.
 */
export = function linuxFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
  var discoveredJavaHomes: string[] = [];
  // Option 1: Try the 'update-java-alternatives' tool
  exec('update-java-alternatives -l', (err: Error, stdout: Buffer, stderr: Buffer) => {
    // This returns error code 1 on success, for some reason.
    if (!err || (<any>err).code == 1) {
      var alts = stdout.toString().trim().split('\n');
      for (var i=0; i<alts.length; i++) {
        discoveredJavaHomes.push(alts[i].split(' ')[2]);
      }
    }
    // Option 2: Is JAVA_HOME defined?
    // (NOTE: locate_java_home will prune redundancies.)
    if (process.env.JAVA_HOME) {
      discoveredJavaHomes.push(process.env.JAVA_HOME);
    }

    // Option 3: Can we invoke 'java' directly?
    exec(`java -version`, function(err: Error, stdout: Buffer, stderr: Buffer) {
      if (err) {
        // Nope. Return what we have.
        cb(discoveredJavaHomes);
      } else {
        // Find JAVA_HOME for Java.
        exec(`which java`, function(err: Error, stdout: Buffer, stderr: Buffer) {
          if (!err) {
            var javaPath = stdout.toString().trim();
            // Trace path.
            try {
              while (1) {
                javaPath = fs.readlinkSync(javaPath);
              }
            } catch (e) {
              // We reached the end of the link chain.
            }
            // JAVA_HOME/bin/java => JAVA_HOME
            discoveredJavaHomes.push(path.resolve(javaPath, "..", ".."));
          }
          cb(discoveredJavaHomes);
        });
      }
    });
  });
}
