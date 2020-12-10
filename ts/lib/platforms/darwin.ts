import {exec} from 'child_process';
import {ILocateJavaHomeResult} from '../interfaces';
import commonFindJavaHome from './common';

/**
 * Uses the Mac's java_home utility to find an appropriate version of Java.
 */
export default function macFindJavaHome(): Promise<ILocateJavaHomeResult> {
  return Promise.all([commonFindJavaHome(), useMacsJavaHomeUtility()])
    .then(res => {
      // combine the results:
      return {
        homes: res[0].concat(res[1].homes),
        executableExtension: res[1].executableExtension
      };
    });
}

function useMacsJavaHomeUtility(): Promise<ILocateJavaHomeResult> {
  return new Promise(resolve => {
    exec('/usr/libexec/java_home -V', (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) => {
      /*
        Output example, which java_home prints to stderr [!]:
        Matching Java Virtual Machines (4):
          1.8.0_60, x86_64:	"Java SE 8"	/Library/Java/JavaVirtualMachines/jdk1.8.0_60.jdk/Contents/Home
          1.7.0_79, x86_64:	"Java SE 7"	/Library/Java/JavaVirtualMachines/jdk1.7.0_79.jdk/Contents/Home
          1.6.0_65-b14-468, x86_64:	"Java SE 6"	/Library/Java/JavaVirtualMachines/1.6.0.jdk/Contents/Home
          1.6.0_65-b14-468, i386:	"Java SE 6"	/Library/Java/JavaVirtualMachines/1.6.0.jdk/Contents/Home
       */
      // Ditch boilerplate first line, and trim ending newlines.
      let installations = stderr.toString().trim().split('\n').slice(1);
      // Map to paths.
      // TODO: We assume that quotes cannot be in the paths.
      installations = installations.map((install) => install.slice(install.lastIndexOf('"') + 1).trim());

      resolve({homes: installations});
    });
  });
}
