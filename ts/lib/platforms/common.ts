// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2011-2020 ETH Zurich.

import {exec} from 'child_process';

/**
 * Contains helpers providing functionality common to all platforms.
 * In particular the following two options are used:
 * - the JAVA_HOME environment variable
 * - Java on the PATH.
 */
export default function commonFindJavaHome(): Promise<string[]> {
  return Promise.all([getJavaHomeEnvVar(), getJavaFromPath()])
    .then(flatten);
}

function getJavaHomeEnvVar(): Promise<string[]> {
  if (process.env.JAVA_HOME) {
    return Promise.resolve([process.env.JAVA_HOME!]);
  } else {
    return Promise.resolve([]);
  }
}

function getJavaFromPath(): Promise<string[]> {
  return new Promise(resolve => {
    exec('java -XshowSettings:properties -version', (err: Error | null, stdout: Buffer | string, stderr: Buffer | string) => {
      const java_home_line = stderr.toString().trim().split("\n")
        .find((line) => line.indexOf("java.home") != -1);
      if (java_home_line == null) {
        resolve([]);
      } else {
        const home = java_home_line.split("=")[1].trim();
        resolve([home]);
      }
    });
  });
}

export function flatten<T>(matrix: T[][]): T[] {
  if (matrix == null) {
    return [];
  }
  return matrix.reduce((prevVal: T[], curVal: T[]) => {
    return prevVal.concat(curVal);
  }, []);
}
