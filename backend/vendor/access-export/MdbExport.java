import com.healthmarketscience.jackcess.ColumnBuilder;
import com.healthmarketscience.jackcess.DataType;
import com.healthmarketscience.jackcess.Database;
import com.healthmarketscience.jackcess.DatabaseBuilder;
import com.healthmarketscience.jackcess.Table;
import com.healthmarketscience.jackcess.TableBuilder;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * mdb-export: turn a UTF-8 CSV into a Microsoft Access (.mdb, Jet 4 / Access 2000+) database.
 *
 * Usage: java -jar mdb-export.jar <output.mdb> <input.csv> [tableName]
 *
 * CSV rules: RFC4180 (quoted fields, "" escapes, CRLF or LF). First row = column headers.
 * Column types are inferred per column across all data rows:
 *   - integer (no leading zeros, fits int32)  -> LONG
 *   - decimal number                          -> DOUBLE
 *   - empty column / mixed text / anything    -> TEXT (MEMO when any value exceeds 255 chars)
 * This mirrors what the Excel export shows: numbers as numbers, everything else as text.
 */
public class MdbExport {
  private static final int TEXT_MAX = 255;

  public static void main(String[] args) throws Exception {
    if (args.length < 2) {
      System.err.println("usage: java -jar mdb-export.jar <output.mdb> <input.csv> [tableName]");
      System.exit(2);
    }
    File outFile = new File(args[0]);
    File csvFile = new File(args[1]);
    String tableName = args.length >= 3 ? args[2] : "Export";

    String csv = new String(Files.readAllBytes(Paths.get(csvFile.getPath())), StandardCharsets.UTF_8);
    // strip UTF-8 BOM if present
    if (!csv.isEmpty() && csv.charAt(0) == '\uFEFF') csv = csv.substring(1);

    List<String[]> records = readCsv(csv);
    if (records.isEmpty()) {
      System.err.println("csv is empty");
      System.exit(3);
    }
    String[] headers = records.get(0);
    List<String[]> data = new ArrayList<String[]>(records.subList(1, records.size()));

    int n = headers.length;
    String[] colNames = uniqueColumnNames(headers);
    int[] kinds = new int[n]; // 0 TEXT, 1 MEMO, 2 LONG, 3 DOUBLE
    for (int c = 0; c < n; c++) kinds[c] = inferKind(c, data);

    if (outFile.exists() && !outFile.delete()) {
      System.err.println("cannot overwrite " + outFile);
      System.exit(4);
    }

    Database db = new DatabaseBuilder(outFile)
        .setFileFormat(Database.FileFormat.V2000)
        .create();
    try {
      TableBuilder tb = new TableBuilder(sanitizeObjectName(tableName, "Export"));
      for (int c = 0; c < n; c++) {
        tb.addColumn(makeColumn(colNames[c], kinds[c]));
      }
      Table table = tb.toTable(db);
      for (String[] row : data) {
        Object[] values = new Object[n];
        for (int c = 0; c < n; c++) {
          values[c] = convert(c < row.length ? row[c] : "", kinds[c]);
        }
        table.addRow(values);
      }
    } finally {
      db.close();
    }
    System.out.println("wrote " + outFile.getAbsolutePath() + " (" + data.size() + " rows, " + n + " columns)");
  }

  private static ColumnBuilder makeColumn(String name, int kind) {
    if (kind == 1) return new ColumnBuilder(name, DataType.MEMO);
    if (kind == 2) return new ColumnBuilder(name, DataType.LONG);
    if (kind == 3) return new ColumnBuilder(name, DataType.DOUBLE);
    return new ColumnBuilder(name, DataType.TEXT).setLength(TEXT_MAX);
  }

  private static final int KIND_TEXT = 0;
  private static final int KIND_MEMO = 1;
  private static final int KIND_LONG = 2;
  private static final int KIND_DOUBLE = 3;

  private static int inferKind(int col, List<String[]> data) {
    boolean any = false;
    boolean allLong = true;
    boolean allDouble = true;
    int maxLen = 0;
    for (String[] row : data) {
      String v = col < row.length ? row[col] : "";
      if (v == null) v = "";
      if (v.length() > maxLen) maxLen = v.length();
      if (v.isEmpty()) continue;
      any = true;
      if (!isIntegerLiteral(v)) allLong = false;
      if (!isDoubleLiteral(v)) allDouble = false;
    }
    if (!any) return KIND_TEXT;
    if (allLong) {
      // only use LONG when every value fits in int32 (Access Long Integer)
      try {
        for (String[] row : data) {
          String v = col < row.length ? row[col] : "";
          if (v.isEmpty()) continue;
          long x = Long.parseLong(v);
          if (x < Integer.MIN_VALUE || x > Integer.MAX_VALUE) return KIND_DOUBLE;
        }
        return KIND_LONG;
      } catch (NumberFormatException ignored) {
        // fall through to double/text
      }
      return KIND_DOUBLE;
    }
    if (allDouble) return KIND_DOUBLE;
    if (maxLen > TEXT_MAX) return KIND_MEMO;
    return KIND_TEXT;
  }

  /** Strict integer: optional minus, no leading zeros, only digits. */
  private static boolean isIntegerLiteral(String v) {
    return v.matches("-?(0|[1-9][0-9]*)");
  }

  /** Strict decimal: integer part without bogus leading zeros plus fractional part. */
  private static boolean isDoubleLiteral(String v) {
    return v.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?");
  }

  private static Object convert(String v, int kind) {
    if (v == null) v = "";
    switch (kind) {
      case KIND_LONG:
      case KIND_DOUBLE:
        if (v.isEmpty()) return null;
        try {
          if (kind == KIND_LONG) return Integer.valueOf(v);
          return Double.valueOf(v);
        } catch (NumberFormatException e) {
          return null;
        }
      case KIND_MEMO:
      case KIND_TEXT:
      default:
        return v;
    }
  }

  private static String[] uniqueColumnNames(String[] headers) {
    String[] out = new String[headers.length];
    Set<String> used = new HashSet<String>();
    for (int i = 0; i < headers.length; i++) {
      String base = sanitizeObjectName(headers[i], "Column" + (i + 1));
      String name = base;
      int suffix = 2;
      while (!used.add(name.toLowerCase(Locale.ROOT))) {
        String tail = "_" + suffix++;
        name = base.length() + tail.length() > 64 ? base.substring(0, 64 - tail.length()) + tail : base + tail;
      }
      out[i] = name;
    }
    return out;
  }

  /** Access object names: max 64 chars; no '.', '!', '[', ']', '#', or control chars. */
  private static String sanitizeObjectName(String raw, String fallback) {
    if (raw == null) return fallback;
    String s = raw.trim().replaceAll("[.!\\[\\]#\\u0000-\\u001F]", "_");
    s = s.replaceAll("\\s+", " ");
    if (s.isEmpty()) s = fallback;
    if (s.length() > 64) s = s.substring(0, 64);
    return s;
  }

  /** RFC4180 parser (quoted fields, "" escapes, CRLF/LF, embedded newlines). */
  private static List<String[]> readCsv(String content) throws Exception {
    List<String[]> rows = new ArrayList<String[]>();
    StringBuilder cell = new StringBuilder();
    List<String> row = new ArrayList<String>();
    boolean inQuotes = false;
    for (int i = 0; i < content.length(); i++) {
      char ch = content.charAt(i);
      if (inQuotes) {
        if (ch == '"') {
          if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
            cell.append('"');
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell.append(ch);
        }
      } else if (ch == '"' && cell.length() == 0) {
        inQuotes = true;
      } else if (ch == ',') {
        row.add(cell.toString());
        cell.setLength(0);
      } else if (ch == '\n') {
        row.add(cell.toString());
        cell.setLength(0);
        rows.add(row.toArray(new String[0]));
        row = new ArrayList<String>();
      } else if (ch == '\r') {
        // handled by \n; bare CR also ends the row
        if (i + 1 >= content.length() || content.charAt(i + 1) != '\n') {
          row.add(cell.toString());
          cell.setLength(0);
          rows.add(row.toArray(new String[0]));
          row = new ArrayList<String>();
        }
      } else {
        cell.append(ch);
      }
    }
    if (cell.length() > 0 || !row.isEmpty()) {
      row.add(cell.toString());
      rows.add(row.toArray(new String[0]));
    }
    return rows;
  }
}
