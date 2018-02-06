import Darwin from './platforms/darwin';
import Linux from './platforms/linux';
import Win32 from './platforms/win32';

export default function GetPlatform(type: string): typeof Darwin {
  switch (type) {
    case 'darwin':
      return Darwin;
    case 'linux':
      return Linux;
    case 'win32':
      return Win32;
    default:
      throw new Error(`locate-java-home does not support the platform ${type}.
Please file a bug at https://github.com/jvilk/locate-java-home and we can see what we can do about that. :)`);
  }
}
