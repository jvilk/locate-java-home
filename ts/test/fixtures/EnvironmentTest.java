/**
 * Prints out information about the Java environment for comparison against
 * LocateJavaHome.
 */
class EnvironmentTest {
  public static void main(String[] args) {
    // Escape backslashes in path (Windows).
    String path = System.getProperty("java.home").replace("\\", "\\\\");
    String version = System.getProperty("java.version");
    int index = version.indexOf('_');
    if (index != -1) {
      version = version.substring(0, index);
    }

    boolean is64Bit = System.getProperty("sun.arch.data.model").equals("64");
    System.out.println("{\"path\": \"" + path + "\", \"version\": \"" + version + "\", \"is64Bit\": " + is64Bit + " }");
  }
}