import type { Bilingual, ServiceType, SystemModel, Zone } from "../domain/types";

/*
 * Vocabulary for the synthetic data generator. Every name, district and
 * product below is invented for this portfolio demo. Person names are built
 * by randomly pairing common given names with common family names, so no
 * generated record corresponds to a real individual or business.
 */

export const ZONES: Zone[] = [
  { id: "z-north", name: { en: "North Zone", ar: "المنطقة الشمالية" } },
  { id: "z-east", name: { en: "East Zone", ar: "المنطقة الشرقية" } },
  { id: "z-central", name: { en: "Central Zone", ar: "المنطقة الوسطى" } },
  { id: "z-west", name: { en: "West Zone", ar: "المنطقة الغربية" } },
  { id: "z-south", name: { en: "South Zone", ar: "المنطقة الجنوبية" } },
];

/** Invented neighbourhood names, grouped by zone. */
export const DISTRICTS: Record<string, Bilingual[]> = {
  "z-north": [
    { en: "Palm Grove", ar: "بستان النخيل" },
    { en: "Amber Hills", ar: "تلال الكهرمان" },
    { en: "Falcon Ridge", ar: "مرتفعات الصقر" },
  ],
  "z-east": [
    { en: "Sunrise Gardens", ar: "حدائق الشروق" },
    { en: "Pearl Quarter", ar: "حي اللؤلؤ" },
    { en: "Coral Bay", ar: "خليج المرجان" },
  ],
  "z-central": [
    { en: "Old Market", ar: "السوق القديم" },
    { en: "Crescent Park", ar: "منتزه الهلال" },
    { en: "Cedar Court", ar: "ساحة الأرز" },
  ],
  "z-west": [
    { en: "Sandstone Village", ar: "قرية الحجر الرملي" },
    { en: "Oasis Fields", ar: "حقول الواحة" },
    { en: "Breeze Terrace", ar: "شرفة النسيم" },
  ],
  "z-south": [
    { en: "Lantern Square", ar: "ميدان الفانوس" },
    { en: "Willow Springs", ar: "ينابيع الصفصاف" },
    { en: "Saffron District", ar: "حي الزعفران" },
  ],
};

export const SYSTEMS: SystemModel[] = [
  { id: "s-ro5", name: { en: "AquaPure RO-5", ar: "أكوا بيور RO-5" }, stages: 5 },
  { id: "s-ro7", name: { en: "AquaPure RO-7 Mineral", ar: "أكوا بيور RO-7 معادن" }, stages: 7 },
  { id: "s-uv", name: { en: "ClearFlow UV+RO", ar: "كلير فلو UV+RO" }, stages: 6 },
  { id: "s-whole", name: { en: "HomeShield Whole-House", ar: "هوم شيلد للمنزل كاملاً" }, stages: 3 },
  { id: "s-compact", name: { en: "SlimLine Under-Sink", ar: "سليم لاين تحت المغسلة" }, stages: 4 },
];

export const GIVEN_NAMES: Bilingual[] = [
  { en: "Omar", ar: "عمر" }, { en: "Layla", ar: "ليلى" }, { en: "Khalid", ar: "خالد" },
  { en: "Noura", ar: "نورة" }, { en: "Faisal", ar: "فيصل" }, { en: "Reem", ar: "ريم" },
  { en: "Yousef", ar: "يوسف" }, { en: "Hessa", ar: "حصة" }, { en: "Tariq", ar: "طارق" },
  { en: "Maha", ar: "مها" }, { en: "Saad", ar: "سعد" }, { en: "Dana", ar: "دانة" },
  { en: "Ibrahim", ar: "إبراهيم" }, { en: "Lama", ar: "لمى" }, { en: "Hamad", ar: "حمد" },
  { en: "Sara", ar: "سارة" }, { en: "Majed", ar: "ماجد" }, { en: "Joud", ar: "جود" },
  { en: "Nasser", ar: "ناصر" }, { en: "Abeer", ar: "عبير" }, { en: "Ziad", ar: "زياد" },
  { en: "Hind", ar: "هند" }, { en: "Bandar", ar: "بندر" }, { en: "Ghada", ar: "غادة" },
  { en: "Adel", ar: "عادل" }, { en: "Rana", ar: "رنا" }, { en: "Waleed", ar: "وليد" },
  { en: "Shahad", ar: "شهد" }, { en: "Mazen", ar: "مازن" }, { en: "Afnan", ar: "أفنان" },
];

export const FAMILY_NAMES: Bilingual[] = [
  { en: "Al-Rashed", ar: "الراشد" }, { en: "Al-Nasser", ar: "الناصر" }, { en: "Al-Fahad", ar: "الفهد" },
  { en: "Al-Saleh", ar: "الصالح" }, { en: "Al-Hamdan", ar: "الحمدان" }, { en: "Al-Mansour", ar: "المنصور" },
  { en: "Al-Khalil", ar: "الخليل" }, { en: "Al-Jaber", ar: "الجابر" }, { en: "Al-Saif", ar: "السيف" },
  { en: "Al-Omari", ar: "العمري" }, { en: "Al-Badr", ar: "البدر" }, { en: "Al-Hakim", ar: "الحكيم" },
  { en: "Al-Turki", ar: "التركي" }, { en: "Al-Majid", ar: "الماجد" }, { en: "Al-Yami", ar: "اليامي" },
  { en: "Al-Nouri", ar: "النوري" }, { en: "Al-Sabah", ar: "الصباح" }, { en: "Al-Fares", ar: "الفارس" },
];

/** Invented business names for the commercial segment. */
export const BUSINESS_NAMES: Bilingual[] = [
  { en: "Blue Cup Café", ar: "مقهى الكوب الأزرق" },
  { en: "Little Steps Nursery", ar: "حضانة الخطوات الصغيرة" },
  { en: "Greenleaf Clinic", ar: "عيادة الورقة الخضراء" },
  { en: "Sunbeam Bakery", ar: "مخبز شعاع الشمس" },
  { en: "Northwind Offices", ar: "مكاتب الرياح الشمالية" },
  { en: "Harbor Fitness", ar: "نادي الميناء الرياضي" },
  { en: "Olive Table Restaurant", ar: "مطعم مائدة الزيتون" },
  { en: "Bright Minds Academy", ar: "أكاديمية العقول المشرقة" },
];

export const TECHNICIAN_ROSTER: { name: Bilingual; zoneId: string; skills: ServiceType[]; joinedYear: number }[] = [
  { name: { en: "Hassan Al-Qadri", ar: "حسن القادري" }, zoneId: "z-north", skills: ["maintenance", "installation", "inspection"], joinedYear: 2019 },
  { name: { en: "Mona Al-Harith", ar: "منى الحارث" }, zoneId: "z-north", skills: ["maintenance", "inspection"], joinedYear: 2022 },
  { name: { en: "Fahad Al-Ghanim", ar: "فهد الغانم" }, zoneId: "z-east", skills: ["maintenance", "installation"], joinedYear: 2020 },
  { name: { en: "Rakan Al-Zaid", ar: "راكان الزيد" }, zoneId: "z-east", skills: ["installation", "inspection"], joinedYear: 2023 },
  { name: { en: "Salem Al-Otaibi", ar: "سالم العتيبي" }, zoneId: "z-central", skills: ["maintenance", "installation", "inspection"], joinedYear: 2018 },
  { name: { en: "Amal Al-Suwaidi", ar: "أمل السويدي" }, zoneId: "z-central", skills: ["maintenance", "inspection"], joinedYear: 2021 },
  { name: { en: "Badr Al-Mutlaq", ar: "بدر المطلق" }, zoneId: "z-west", skills: ["maintenance", "installation"], joinedYear: 2020 },
  { name: { en: "Yasser Al-Hamad", ar: "ياسر الحمد" }, zoneId: "z-south", skills: ["maintenance", "installation", "inspection"], joinedYear: 2021 },
];

export const SERVICE_DURATION: Record<ServiceType, number> = {
  maintenance: 60,
  installation: 120,
  inspection: 45,
};

/** Field checklist steps per service type (labels live in the i18n dictionaries). */
export const CHECKLIST_STEPS: Record<ServiceType, string[]> = {
  maintenance: ["arrive", "replaceFilters", "qualityTest", "signOff"],
  installation: ["arrive", "siteSurvey", "mountUnit", "qualityTest", "handover"],
  inspection: ["arrive", "inspectUnit", "signOff"],
};

export const VISIT_NOTES: Bilingual[] = [
  { en: "Customer prefers a call 30 minutes before arrival.", ar: "يفضّل العميل الاتصال قبل الوصول بـ30 دقيقة." },
  { en: "Ask the security desk for building access.", ar: "اطلب الدخول من مكتب الأمن في المبنى." },
  { en: "Low pressure reported at the kitchen tap.", ar: "أبلغ العميل عن ضعف الضغط في صنبور المطبخ." },
  { en: "Replace sediment pre-filter; carbon block was fine last visit.", ar: "استبدال فلتر الرواسب؛ فلتر الكربون كان سليماً في الزيارة السابقة." },
  { en: "Limited parking — use the side entrance.", ar: "المواقف محدودة — استخدم المدخل الجانبي." },
  { en: "Taste complaint — run a TDS check before and after.", ar: "ملاحظة على الطعم — قياس TDS قبل الخدمة وبعدها." },
];

export const CUSTOMER_NOTES: Bilingual[] = [
  { en: "Prefers morning visits.", ar: "يفضّل الزيارات الصباحية." },
  { en: "Second unit installed on the upper floor.", ar: "وحدة ثانية مركّبة في الطابق العلوي." },
  { en: "Hard-water area — check scale build-up each visit.", ar: "منطقة مياه عسرة — افحص الترسبات في كل زيارة." },
  { en: "Contact through the office manager.", ar: "التواصل عبر مدير المكتب." },
];
