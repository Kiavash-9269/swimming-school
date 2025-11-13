import RecordYab from"../components/record/RecordYab"

export default function RecordPage() {
    return (
        <div>
            <RecordYab />
        </div>
    );
}
const records = [
    // آزاد - رکوردهای جهانی
    { event: "50m آزاد", time: 20.91, distance: 50, holder: "Cesar Cielo", type: "خارجی", discipline: "آزاد" },
    { event: "100m آزاد", time: 46.40, distance: 100, holder: "Pan Zhanle", type: "خارجی", discipline: "آزاد" },
    { event: "200m آزاد", time: 102.00, distance: 200, holder: "Paul Biedermann", type: "خارجی", discipline: "آزاد" },
    { event: "400m آزاد", time: 219.96, distance: 400, holder: "Lukas Märtens", type: "خارجی", discipline: "آزاد" },
    { event: "800m آزاد", time: 452.12, distance: 800, holder: "Zhang Lin", type: "خارجی", discipline: "آزاد" },
    { event: "1500m آزاد", time: 870.67, distance: 1500, holder: "Bobby Finke", type: "خارجی", discipline: "آزاد" },

    // آزاد - رکوردهای ملی ایران
    { event: "50m آزاد ایران", time: 22.41, distance: 50, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
    { event: "100m آزاد ایران", time: 50.34, distance: 100, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
    { event: "200m آزاد ایران", time: 110.30, distance: 200, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "400m آزاد ایران", time: 233.16, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "800m آزاد ایران", time: 491.83, distance: 800, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "1500m آزاد ایران", time: 966.66, distance: 1500, holder: "علی جعفری", type: "داخلی", discipline: "آزاد" },

    // پروانه - رکوردهای جهانی
    { event: "50m پروانه", time: 22.27, distance: 50, holder: "Andriy Govorov", type: "خارجی", discipline: "پروانه" },
    { event: "100m پروانه", time: 49.45, distance: 100, holder: "Caeleb Dressel", type: "خارجی", discipline: "پروانه" },
    { event: "200m پروانه", time: 110.34, distance: 200, holder: "Kristóf Milák", type: "خارجی", discipline: "پروانه" },

    // پروانه - رکوردهای ملی ایران
    { event: "50m پروانه ایران", time: 24.15, distance: 50, holder: "مهردشاد افقری", type: "داخلی", discipline: "پروانه" },
    { event: "100m پروانه ایران", time: 53.32, distance: 100, holder: "مهردشاد افقری", type: "داخلی", discipline: "پروانه" },
    { event: "200m پروانه ایران", time: 119.97, distance: 200, holder: "متین بالسینی", type: "داخلی", discipline: "پروانه" },

    // کرال پشت - رکوردهای جهانی
    { event: "50m کرال پشت", time: 23.55, distance: 50, holder: "Kliment Kolesnikov", type: "خارجی", discipline: "کرال پشت" },
    { event: "100m کرال پشت", time: 51.60, distance: 100, holder: "Thomas Ceccon", type: "خارجی", discipline: "کرال پشت" },
    { event: "200m کرال پشت", time: 111.92, distance: 200, holder: "Aaron Peirsol", type: "خارجی", discipline: "کرال پشت" },

    // کرال پشت - رکوردهای ملی ایران
    { event: "50m کرال پشت ایران", time: 25.90, distance: 50, holder: "هومر عباسی", type: "داخلی", discipline: "کرال پشت" },
    { event: "100m کرال پشت ایران", time: 56.36, distance: 100, holder: "ابوالفضل سام", type: "داخلی", discipline: "کرال پشت" },
    { event: "200m کرال پشت ایران", time: 124.67, distance: 200, holder: "ابوالفضل سام", type: "داخلی", discipline: "کرال پشت" },

    // غورباقه - رکوردهای جهانی
    { event: "50m غورباقه", time: 25.95, distance: 50, holder: "Adam Peaty", type: "خارجی", discipline: "غورباقه" },
    { event: "100m غورباقه", time: 56.88, distance: 100, holder: "Adam Peaty", type: "خارجی", discipline: "غورباقه" },
    { event: "200m غورباقه", time: 126.00, distance: 200, holder: "Anton Chupkov", type: "خارجی", discipline: "غورباقه" },

    // غورباقه - رکوردهای ملی ایران
    { event: "50m غورباقه ایران", time: 27.95, distance: 50, holder: "محمد علیرضایی دریزچه", type: "داخلی", discipline: "غورباقه" },
    { event: "100m غورباقه ایران", time: 62.12, distance: 100, holder: "امیر مطاعی", type: "داخلی", discipline: "غورباقه" },
    { event: "200m غورباقه ایران", time: 137.67, distance: 200, holder: "علیرضا عرب", type: "داخلی", discipline: "غورباقه" },

    // مختلط انفرادی - رکوردهای ملی ایران
    { event: "200m مختلط ایران", time: 125.87, distance: 200, holder: "متین سهران", type: "داخلی", discipline: "مختلط" },
    { event: "400m مختلط ایران", time: 275.34, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "مختلط" }
  ];
