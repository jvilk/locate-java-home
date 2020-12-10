import {ILocateJavaHomeResult} from '../interfaces';

/**
 * Contains helpers providing functionality common to all platforms.
 * In particular the following two options are used:
 * - the JAVA_HOME environment variable
 * - Java on the PATH. (TODO)
 */
export default function commonFindJavaHome(): Promise<ILocateJavaHomeResult> {
    const homes: string[] = [];
    if (process.env.JAVA_HOME) {
        homes.push(process.env.JAVA_HOME!);
    }
    return Promise.resolve({
        homes: homes
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
