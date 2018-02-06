/**
 * Prints out information about the Java environment for comparison against
 * LocateJavaHome.
 */
class EnvironmentTest {
  public static void main(String[] args) {
    // Escape backslashes in path (Windows).
    String path = System.getProperty("java.home").replace("\\", "\\\\");
    String versionFull = System.getProperty("java.version");
    int index = versionFull.indexOf('_');
    String version = versionFull;
    String security = "0";
    if (index != -1) {
      version = versionFull.substring(0, index);
      security = versionFull.substring(index + 1);
    }
    boolean is64Bit = System.getProperty("sun.arch.data.model").equals("64");
    System.out.println("{\"path\": \"" + path + "\", \"version\": \"" + version + "\", \"is64Bit\": " + is64Bit + ", \"security\": " + security + " }");
  }
}