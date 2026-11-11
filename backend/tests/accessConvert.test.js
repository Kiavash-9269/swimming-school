const { buildMdbBuffer } = require("../src/modules/reports/access");
const { convertAccessBufferToExcel } = require("../src/modules/reports/accessConvert");
const {
  buildColumnMap,
  mapRow,
  normalizePhone,
  parseGender,
} = require("../src/modules/enrollments/participantImport.service");

describe("Access → Excel conversion", () => {
  it("converts an mdb buffer into xlsx with biometric columns preserved", async () => {
    const mdb = await buildMdbBuffer({
      sheetName: "Students",
      columns: [
        { header: "نام", key: "firstName" },
        { header: "نام خانوادگی", key: "lastName" },
        { header: "موبایل", key: "phone" },
        { header: "اثر انگشت", key: "fingerprint" },
        { header: "چهره", key: "faceData" },
        { header: "جنسیت", key: "gender" },
      ],
      rows: [
        {
          firstName: "سارا",
          lastName: "احمدی",
          phone: "09120001122",
          fingerprint: "FP-ABC",
          faceData: "FACE-XYZ",
          gender: "زن",
        },
      ],
    });

    const out = await convertAccessBufferToExcel(mdb, { originalName: "roster.mdb" });
    expect(out.buffer.length).toBeGreaterThan(1000);
    expect(out.filename).toMatch(/\.xlsx$/);
    expect(out.tableCount).toBe(1);
    expect(out.rowCount).toBe(1);

    const table = out.tables[0];
    expect(table.columns).toEqual(
      expect.arrayContaining(["نام", "نام خانوادگی", "موبایل", "اثر انگشت", "چهره", "جنسیت"]),
    );
    expect(table.rows[0]["اثر انگشت"]).toBe("FP-ABC");
    expect(table.rows[0]["چهره"]).toBe("FACE-XYZ");
  }, 60000);
});

describe("Access import column mapping", () => {
  it("maps Persian biometric headers and normalizes phone/gender", () => {
    expect(normalizePhone("۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(parseGender("زن")).toBe("FEMALE");

    const columns = ["نام", "نام خانوادگی", "موبایل", "اثر انگشت", "چهره", "شماره کارت"];
    const { map, used } = buildColumnMap(columns);
    const mapped = mapRow(
      {
        نام: "علی",
        "نام خانوادگی": "رضایی",
        موبایل: "09123334455",
        "اثر انگشت": "TPL1",
        چهره: "FACE1",
        "شماره کارت": "9988",
      },
      map,
      used,
    );

    expect(mapped.firstName).toBe("علی");
    expect(mapped.lastName).toBe("رضایی");
    expect(mapped.phone).toBe("09123334455");
    expect(mapped.fingerprint).toBe("TPL1");
    expect(mapped.faceData).toBe("FACE1");
    expect(mapped.cardNumber).toBe("9988");
  });

  it("maps legacy Club columns (name/tel/number/card)", () => {
    const columns = ["name", "tel", "number", "card", "address"];
    const { map, used } = buildColumnMap(columns);
    expect(map.firstName).toBe("name");
    expect(map.phone).toBe("tel");
    expect(map.externalId).toBe("number");
    expect(map.cardNumber).toBe("card");

    const mapped = mapRow(
      {
        name: "کیان رضایی",
        tel: "09151112233",
        number: "143",
        card: "0",
        address: "مشهد",
      },
      map,
      used,
    );
    expect(mapped.firstName).toBe("کیان");
    expect(mapped.lastName).toBe("رضایی");
    expect(mapped.phone).toBe("09151112233");
    expect(mapped.externalId).toBe("143");
    expect(mapped.importedFields?.address).toBe("مشهد");
  });
});
