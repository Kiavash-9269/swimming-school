# Access (.mdb) export helper

`mdb-export.jar` converts a UTF-8 CSV into a real Microsoft Access database
(Jet 4 / Access 2000+ format) so admin exports can be offered as `.mdb`
alongside the `.xlsx` files. It is called from
`backend/src/modules/reports/access.js` via `java -jar`.

- Built from `MdbExport.java` with [Jackcess](https://jackcess.sourceforge.io/) 4.0.12
  (bundled inside the jar together with commons-lang3 + commons-logging).
- Target runtime: **Java 8+** (`java` on `PATH`). On Ubuntu:
  `sudo apt install -y default-jre-headless`.
- CSV contract: RFC4180, UTF-8, first row = Persian headers used as Access column names.
  Column types are inferred like the Excel export looks: integers → Long Integer,
  decimals → Double, everything else → Text (Memo above 255 chars).
- Output: `<table>.mdb` with a single table named after the report sheet.

## Rebuilding the jar

```bash
# deps (Maven Central)
jackcess-4.0.12.jar, commons-lang3-3.18.0.jar, commons-logging-1.2.jar

# compile (ecj works on a plain JRE; javac also fine)
java -jar ecj.jar -1.8 -cp "jackcess.jar;commons-lang3.jar;commons-logging.jar" \
  -d classes MdbExport.java

# package: classes/MdbExport.class + the three jars, with
#   META-INF/MANIFEST.MF -> "Main-Class: MdbExport"
```

If the helper is missing or Java is not installed, exports with
`?format=access` return `501 ACCESS_EXPORT_UNAVAILABLE` and the Excel
export keeps working unchanged.
