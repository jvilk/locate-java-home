/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/async/async.d.ts" />
import async = require('async');
import child_process = require('child_process');
var spawn = child_process.spawn;

interface IKeyInfo {
  [valName: string]: string | IKeyInfo
}

/**
 * Find Java on Windows by checking registry keys.
 */
export = function windowsFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
  // Windows: JDK path is in either of the following registry keys:
  // - HKLM\Software\JavaSoft\Java Development Kit\1.[version] [JDK arch == OS arch]
  // - HKLM\Software\Wow6432Node\JavaSoft\Java Development Kit\1.[version] [32-bit JDK Arch, 64-bit OS arch]

  // TODO: Get a proper listing of all JDKs at these locations.
  var keysToCheck: string[] = [
    `HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit`,
    `HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Development Kit`,
    `HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Runtime Environment`
  ];

  var discoveredJavaHomes: string[] = [];
  async.eachSeries(keysToCheck, (key: string, asyncCb: (err?: Error) => void) => {
    getRegistryKey(key, (err: Error, values?: IKeyInfo) => {
      if (!err) {
        Object.keys(values).forEach((value) => {
          if (typeof value === 'object') {
            // subkey.
            if ((<IKeyInfo> values[value])['JavaHome']) {
              discoveredJavaHomes.push(<string> (<IKeyInfo> values[value])['JavaHome']);
            }
          }
        });
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
function getRegistryKey(key: string, cb: (err: Error, values?: IKeyInfo) => void) {
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
        rv: IKeyInfo = {};

      lines.forEach((line: string, idx: number) => {
        lines[idx] = line.trim();
        if (lines[idx].length > 0) {
          if (lineNumber !== 0) {
            items.push(lines[idx]);
          }
          ++lineNumber;
        }
      });

      async.each(items, (item: string, asyncCb: (err?: Error) => void) => {
        var match = ITEM_PATTERN.exec(item);
        if (match) {
          // rv[valName] = value;
          // Second item is the type; we don't care about that.
          rv[match[1].trim()] = match[3];
          asyncCb();
        } else if (item.slice(0, 4) === "HKEY") {
          // It's a HKEY_[etc]\ path. Recursively expand!
          getRegistryKey(item.trim(), (err, vals) => {
            if (!err) {
              rv[item.slice(item.lastIndexOf('\\') + 1)] = vals;
            }
            asyncCb(err);
          });
        }
      }, (err?: Error) => {
        cb(err, rv);
      });
    }
  });
}
