import {exec} from 'child_process';

/**
 * Uses the Mac's java_home utility to find an appropriate version of Java.
 */
export default function macFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
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
    cb(installations);
  });
}
