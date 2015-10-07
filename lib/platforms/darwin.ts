/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/async/async.d.ts" />
import child_process = require('child_process');
import fs = require('fs');
import path = require('path');
import async = require('async');
var exec = child_process.exec;

/**
 * Uses the Mac's java_home utility to find an appropriate version of Java.
 */
export = function macFindJavaHome(cb: (homes: string[], executableExtension?: string) => void): void {
  var discoveredJavaHomes: string[] = [];
  // TODO: Look through entire list.
  async.eachSeries(['5','6','7','8','9'], (version: string, asyncCb: (err?: Error) => void) => {
    exec('/usr/libexec/java_home -version 1.' + version, (err: Error, stdout: Buffer, stderr: Buffer) => {
      if (!err) {
        discoveredJavaHomes.push(stdout.toString().replace('\n', '').trim());
      }
      asyncCb();
    });
  }, (err?: Error) => {
    cb(discoveredJavaHomes);
  });
}
