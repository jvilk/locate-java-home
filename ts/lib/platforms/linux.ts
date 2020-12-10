import {exec} from 'child_process';
import {ILocateJavaHomeResult} from '../interfaces';
import commonFindJavaHome from './common';

/**
 * Find Java in Linux using three methods:
 * - `update-java-alternatives`,
 */
export default function linuxFindJavaHome(): Promise<ILocateJavaHomeResult> {
  return Promise.all([commonFindJavaHome(), useUpdateJavaAlternatives()])
    .then(res => {
      // combine the results:
      return {
        homes: res[0].concat(res[1].homes),
        executableExtension: res[1].executableExtension
      };
    });
}

function useUpdateJavaAlternatives(): Promise<ILocateJavaHomeResult> {
  return new Promise(resolve => {
    exec('update-java-alternatives -l', (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) => {
      const discoveredJavaHomes: string[] = [];
      // This returns error code 1 on success, for some reason.
      if (!err || (<any>err).code == 1) {
        const alts = stdout.toString().trim().split('\n');
        for (const alt of alts) {
          // "java-1.7.0-openjdk-amd64 1071 /usr/lib/jvm/java-1.7.0-openjdk-amd64"
          discoveredJavaHomes.push(alt.split(' ')[2]);
        }
      }
      resolve({homes: discoveredJavaHomes});
    });
  });
}
