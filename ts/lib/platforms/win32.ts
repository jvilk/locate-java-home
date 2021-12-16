import {each as asyncEach} from 'async';
import {spawnSync} from 'child_process';
import {ILocateJavaHomeResult} from '../interfaces';
import commonFindJavaHome, {flatten} from './common';

interface IKeyInfo {
  [valName: string]: string | IKeyInfo
}

/**
 * Find Java on Windows by checking registry keys and PATH
 */
export default function windowsFindJavaHome(): Promise<ILocateJavaHomeResult> {
  return Promise.all([commonFindJavaHome(), checkRegistryKeys()])
    .then(res => {
      // combine the results:
      return {
        homes: res[0].concat(res[1].homes),
        executableExtension: res[1].executableExtension
      };
    });
}

function checkRegistryKeys(): Promise<ILocateJavaHomeResult> {
  // Windows: JDK path is in either of the following registry keys:
  // - HKLM\Software\JavaSoft\Java Development Kit\1.[version] [JDK arch == OS arch]
  // - HKLM\Software\Wow6432Node\JavaSoft\Java Development Kit\1.[version] [32-bit JDK Arch, 64-bit OS arch]

  // TODO: Get a proper listing of all JDKs at these locations.
  const keysToCheck: string[] = [
    `HKLM\\SOFTWARE\\JavaSoft\\JDK`,
    `HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit`,
    `HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\JDK`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Development Kit`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Runtime Environment`
  ];

  return Promise.all(keysToCheck.map(checkRegistry))
    .then(flatten)
    .then(homes => {
      return {
        homes: homes, 
        executableExtension: 'exe'
      };
    });
}

function checkRegistry(key: string): Promise<string[]> {
  return new Promise(resolve => {
    getRegistryKey(key, (err?: Error | null, values?: IKeyInfo) => {
      if (err) {
        resolve([]);
      } else {
        const homes: string[] = flatten(Object.keys(values!)
          .map((value) => {
            const keyInfo = values![value];
            if (typeof(keyInfo) === 'object' && keyInfo !== null) {
              // subkey.
              const javaHome = keyInfo.JavaHome;
              if (typeof(javaHome) === "string") {
                // we wrap the results in arrays such that we can return an empty array on error
                // using `flatten`, we recover the one dimensional list of java homes
                // returning null on error and filter out null values leads to typing issues as 
                // the type system apparently cannot prove non-nullness of all elements
                return [javaHome];
              }
            }
            return [];
          }));
        resolve(homes);
      }
    });
  });
}

const ITEM_PATTERN = /^([a-zA-Z0-9_\s\\-]+)\s(REG_SZ|REG_MULTI_SZ|REG_EXPAND_SZ|REG_DWORD|REG_QWORD|REG_BINARY|REG_NONE)\s+([^\s].*)$/;

/**
 * Retrieves the given registry key using the REG command line utility.
 * Returns an error if it fails, or the key as a dictionary if it succeeds.
 * Inspired by node-winreg, but rewritten here due to a bug in that module.
 * https://github.com/fresc81/node-winreg
 */
function getRegistryKey(key: string, cb: (err?: Error | null, values?: IKeyInfo) => void) {
  const args = ['QUERY', key];
  try {
    const proc = spawnSync('REG', args, {
      cwd: undefined,
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    if (proc.status !== 0) {
      return cb(new Error(`REG process exited with code ${proc.status}:\n${proc.stderr.toString()}\n${proc.stdout.toString()}`));
    }
    // Success
    const lines = proc.stdout.toString().split('\n');
    let lineNumber = 0;
    const items: string[] = [];
    const rv: IKeyInfo = {};

    lines.forEach((line: string, idx: number) => {
      lines[idx] = line.trim();
      if (lines[idx].length > 0) {
        if (lineNumber !== 0) {
          items.push(lines[idx]);
        }
        ++lineNumber;
      }
    });

    asyncEach(items, (item: string, asyncCb: (err?: Error | null) => void) => {
      const match = ITEM_PATTERN.exec(item);
      if (match) {
        // rv[valName] = value;
        // Second item is the type; we don't care about that.
        rv[match[1].trim()] = match[3];
        asyncCb();
      } else if (item.slice(0, 4) === "HKEY") {
        // It's a HKEY_[etc]\ path. Recursively expand!
        getRegistryKey(item.trim(), (err, vals) => {
          if (!err) {
            rv[item.slice(item.lastIndexOf('\\') + 1)] = vals!;
          }
          asyncCb(err);
        });
      } else {
        asyncCb();
      }
    }, (err?: Error | null) => {
      cb(err, rv);
    });
  } catch (e) {
    cb(new Error(`exception while getting registry key ${key}: ${e}`));
  }
}
