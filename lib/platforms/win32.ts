/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/async/async.d.ts" />
import async = require('async');
import child_process = require('child_process');
var spawn = child_process.spawn;

/**
 * Find Java on Windows by checking registry keys.
 */
export function windowsFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
  // Windows: JDK path is in either of the following registry keys:
  // - HKLM\Software\JavaSoft\Java Development Kit\1.[version] [JDK arch == OS arch]
  // - HKLM\Software\Wow6432Node\JavaSoft\Java Development Kit\1.[version] [32-bit JDK Arch, 64-bit OS arch]

  // TODO: Get a proper listing of all JDKs at these locations.
  var keysToCheck: string[] = [].concat(['5','6','7','8','9'].map((ver) => [
    `HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit\\1.${ver}`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Development Kit\\1.${ver}`
  ]));

  var discoveredJavaHomes: string[] = [];
  async.eachSeries(keysToCheck, (key: string, asyncCb: (err?: Error) => void) => {
    getRegistryKey(key, (err: Error, values?: { [valName: string]: string }) => {
      if (!err && values['JavaHome']) {
        discoveredJavaHomes.push(values['JavaHome']);
      }
      asyncCb();
    });
  }, (err?: Error): void => {
    cb(discoveredJavaHomes, 'exe');
  });
}

/**
 * Retrieves the given registry key using the REG command line utility.
 * Returns an error if it fails, or the key as a dictionary if it succeeds.
 * Inspired by node-winreg, but rewritten here due to a bug in that module.
 * https://github.com/fresc81/node-winreg
 */
function getRegistryKey(key: string, cb: (err: Error, values?: {[valName: string]: string}) => void) {
  var args = ['QUERY', key],
    proc = spawn('REG', args, {
      cwd: undefined,
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore']
    }), buffer = '',
    ITEM_PATTERN = /^([a-zA-Z0-9_\s\\-]+)\s(REG_SZ|REG_MULTI_SZ|REG_EXPAND_SZ|REG_DWORD|REG_QWORD|REG_BINARY|REG_NONE)\s+([^\s].*)$/;

  proc.stdout.on('data', (data: Buffer) => {
    buffer += data.toString();
  });

  proc.on('close', (code: number) => {
    if (code !== 0) {
      cb(new Error('process exited with code ' + code));
    } else {
      // Success
      var lines = buffer.split('\n'),
        lineNumber = 0,
        items: string[] = [],
        rv: { [valName: string]: string } = {};

      lines.forEach((line: string, idx: number) => {
        lines[idx] = line.trim();
        if (lines[idx].length > 0) {
          if (lineNumber !== 0) {
            items.push(lines[idx]);
          }
          ++lineNumber;
        }
      });

      items.forEach((item: string) => {
        var match = ITEM_PATTERN.exec(item);
        if (match) {
          // rv[valName] = value;
          // Second item is the type; we don't care about that.
          rv[match[1].trim()] = match[3];
        }
      });

      cb(null, rv);
    }
  });
}
