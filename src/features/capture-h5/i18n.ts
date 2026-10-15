import type { LangCode } from '@/i18n';

/*
 * H5 采集页自带的完整词典（与设计稿原型一致）：界面文案 I18N / PARTIAL、票据提示 MSG、
 * 手机端 MOBILE（按发生地语言）、二维码弹窗 QRT。由全局界面语言驱动（useI18n().lang），
 * 不经过全局词典；不在这些词典里的文案（校验层、日志、误差行等）仍用全局 t()。
 */

/** 内置完整翻译的界面语言 */
export type FullUiLang = 'zh' | 'zh-TW' | 'en' | 'es' | 'ar';

/* 18 种界面语言。完整翻译：zh / zh-TW / en / es / ar；其余为部分词条覆盖英文 */
export const LANGS: { k: LangCode; native: string; tag: string }[] = [
  { k: 'zh', native: '简体中文', tag: 'ZH' },
  { k: 'zh-TW', native: '繁體中文', tag: 'ZH-TW' },
  { k: 'en', native: 'English', tag: 'EN' },
  { k: 'ja', native: '日本語', tag: 'JA' },
  { k: 'ko', native: '한국어', tag: 'KO' },
  { k: 'th', native: 'ไทย', tag: 'TH' },
  { k: 'vi', native: 'Tiếng Việt', tag: 'VI' },
  { k: 'id', native: 'Bahasa Indonesia', tag: 'ID' },
  { k: 'hi', native: 'हिन्दी', tag: 'HI' },
  { k: 'fr', native: 'Français', tag: 'FR' },
  { k: 'de', native: 'Deutsch', tag: 'DE' },
  { k: 'es', native: 'Español', tag: 'ES' },
  { k: 'pt', native: 'Português', tag: 'PT' },
  { k: 'it', native: 'Italiano', tag: 'IT' },
  { k: 'nl', native: 'Nederlands', tag: 'NL' },
  { k: 'ru', native: 'Русский', tag: 'RU' },
  { k: 'tr', native: 'Türkçe', tag: 'TR' },
  { k: 'ar', native: 'العربية', tag: 'AR · RTL' }
];

const I18N_RAW = {
  zh: {
    title: '发票导入', railHead: '票据发生地', unattributed: '待归属',
    unkSub: '发生地不明或与上传处不符', local: '本国', rate: '汇率',
    taxLabel: '税种 / 税率', noteLabel: '特殊说明',
    pendingN: '张待处理', geos: '个国家/地区',
    addGeo: '添加发生地', railFoot: '发生地决定税种、识别方式与币种。同一张单可包含多个发生地。',
    pickTitle: '选择国家/地区', pickSub: '按拼音首字母检索，或直接搜索国家、币种与税种。',
    searchPh: '搜索国家 / 币种 / 税种', noMatch: '没有匹配的国家或地区', close: '关闭', all: '全部',
    uiLang: '界面语言', langNote: '切换后所有页面同步使用所选语言。本原型完整翻译了简体中文、繁體中文、English、Español、العربية；其余语言用于检验语言名与版式效果。',
    mTax: '税局取票', mUpload: '上传文件', mPhone: '手机拍票', mScan: '扫描仪', mMail: '邮箱转发', mManual: '手动录入',
    gTodo: '待补全', gCheck: '需核查', gReady: '可导入', gBlocked: '已拦截',
    nTodo: '字段缺失或需要说明。点击缺失项直接填写，无需逐张打开。',
    nCheck: '系统发现重复、超期或与行程不符，需人工判断后再导入。',
    nReady: '字段完整并已通过该发生地的校验规则。',
    nBlocked: '这些文件不会进入任何国家的处理队列，直到你指定发生地。',
    selected: '已选', totalIn: '折算 {c} 合计', cancel: '取消', importN: '导入 {n} 张', importAll: '导入',
    reassign: '改判发生地', more: '更多…', keepFile: '· 无需重新上传，原件与影像保留',
    geoLocked: '发生地 · 已锁定', amount: '金额', origAmount: '原币金额（价税合计）',
    faceFields: '票面信息', attachments: '附件', addAttachment: '添加附件', image: '票面影像',
    convIn: '折算 {c}', emptyIn: '{c}尚无票据', localRate: '本位币 · 无需折算', locked: '随单锁定',
    availableN: '{n} 个国家/地区可选', reassignOne: '改判 1 张票据的发生地 · 原件保留',
    blockedSelected: '所选中有 {n} 张未处理，导入后仍需在报销单内补全',
    blockedUnselected: '{n} 张待处理未选中，可先导入其余票据'
  },
  'zh-TW': {
    title: '發票匯入', railHead: '票據發生地', unattributed: '待歸屬',
    unkSub: '發生地不明或與上傳處不符', local: '本國', rate: '匯率',
    taxLabel: '稅種 / 稅率', noteLabel: '特殊說明',
    pendingN: '張待處理', geos: '個國家/地區',
    addGeo: '新增發生地', railFoot: '發生地決定稅種、辨識方式與幣別。同一張單可包含多個發生地。',
    pickTitle: '選擇國家/地區', pickSub: '以拼音首字母檢索，或直接搜尋國家、幣別與稅種。',
    searchPh: '搜尋國家 / 幣別 / 稅種', noMatch: '沒有符合的國家或地區', close: '關閉', all: '全部',
    uiLang: '介面語言', langNote: '切換後所有頁面同步使用所選語言。本原型完整翻譯了簡體中文、繁體中文、English、Español、العربية；其餘語言用於檢驗語言名與版面效果。',
    mTax: '稅局取票', mUpload: '上傳檔案', mPhone: '手機拍票', mScan: '掃描器', mMail: '郵件轉寄', mManual: '手動輸入',
    gTodo: '待補齊', gCheck: '需核查', gReady: '可匯入', gBlocked: '已攔截',
    nTodo: '欄位缺漏或需要說明。點擊缺漏項直接填寫，不必逐張開啟。',
    nCheck: '系統發現重複、逾期或與行程不符，需人工判斷後再匯入。',
    nReady: '欄位完整並已通過該發生地的檢核規則。',
    nBlocked: '這些檔案不會進入任何國家的處理佇列，直到你指定發生地。',
    selected: '已選', totalIn: '折算 {c} 合計', cancel: '取消', importN: '匯入 {n} 張', importAll: '匯入',
    reassign: '改判發生地', more: '更多…', keepFile: '· 無需重新上傳，原件與影像保留',
    geoLocked: '發生地 · 已鎖定', amount: '金額', origAmount: '原幣金額（含稅）',
    faceFields: '票面資訊', attachments: '附件', addAttachment: '新增附件', image: '票面影像',
    convIn: '折算 {c}', emptyIn: '{c}尚無票據', localRate: '本位幣 · 無需折算', locked: '隨單鎖定',
    availableN: '{n} 個國家/地區可選', reassignOne: '改判 1 張票據的發生地 · 原件保留',
    blockedSelected: '所選中有 {n} 張未處理，匯入後仍需在報銷單內補齊',
    blockedUnselected: '{n} 張待處理未選中，可先匯入其餘票據'
  },
  en: {
    title: 'Import invoices', railHead: 'Place of issue', unattributed: 'Unassigned',
    unkSub: 'Origin unclear, or conflicts with where it was uploaded', local: 'Home', rate: 'Rate',
    taxLabel: 'Tax and rates', noteLabel: 'Local requirements',
    pendingN: ' need work', geos: ' countries',
    addGeo: 'Add a place of issue', railFoot: 'The place of issue determines the tax, the recognition and the currency. One report may span several.',
    pickTitle: 'Choose a country or region', pickSub: 'Jump by first letter, or search by country, currency and tax.',
    searchPh: 'Search country / currency / tax', noMatch: 'No matching country or region', close: 'Close', all: 'All',
    uiLang: 'Interface language', langNote: 'Every page switches with you. Simplified Chinese, Traditional Chinese, English, Spanish and Arabic are fully translated here; the rest are listed to check native names and layout.',
    mTax: 'Fetch from tax bureau', mUpload: 'Upload files', mPhone: 'Phone capture', mScan: 'Scanner', mMail: 'Email forward', mManual: 'Manual entry',
    gTodo: 'To complete', gCheck: 'To review', gReady: 'Ready to import', gBlocked: 'Held',
    nTodo: 'Fields missing or an explanation required. Fill in place — no need to open each one.',
    nCheck: 'Duplicates, out-of-period dates or trip mismatches found. Decide before importing.',
    nReady: 'Complete, and passing this place of issue\u2019s rules.',
    nBlocked: 'These files enter no country\u2019s queue until you assign a place of issue.',
    selected: 'Selected', totalIn: 'Total in {c}', cancel: 'Cancel', importN: 'Import {n}', importAll: 'Import',
    reassign: 'Reassign', more: 'More…', keepFile: '· no re-upload; file and image are kept',
    geoLocked: 'Place of issue · locked', amount: 'Amount', origAmount: 'Original currency (incl. tax)',
    faceFields: 'Document fields', attachments: 'Attachments', addAttachment: 'Add attachment', image: 'Document image',
    convIn: 'In {c}', emptyIn: 'No documents for {c} yet', localRate: 'Home currency · no conversion', locked: 'locked to report',
    availableN: '{n} countries and regions available', reassignOne: 'Reassigning 1 document · file and image kept',
    blockedSelected: '{n} of the selected still need work and must be completed in the report',
    blockedUnselected: '{n} still need work and are unselected — the rest can be imported now'
  },
  es: {
    title: 'Importar facturas', railHead: 'Lugar de emisión', unattributed: 'Sin asignar',
    unkSub: 'Origen poco claro o en conflicto con el lugar de carga', local: 'País propio', rate: 'Tipo',
    taxLabel: 'Impuesto y tipos', noteLabel: 'Requisitos locales',
    pendingN: ' por resolver', geos: ' países',
    addGeo: 'Añadir lugar de emisión', railFoot: 'El lugar de emisión determina el impuesto, el reconocimiento y la moneda. Un informe puede abarcar varios.',
    pickTitle: 'Elegir país o región', pickSub: 'Salta por letra inicial o busca por país, moneda e impuesto.',
    searchPh: 'Buscar país / moneda / impuesto', noMatch: 'Ningún país o región coincide', close: 'Cerrar', all: 'Todos',
    uiLang: 'Idioma de la interfaz', langNote: 'Todas las páginas cambian a la vez. Chino simplificado, chino tradicional, inglés, español y árabe están traducidos por completo; el resto figura para comprobar nombres nativos y maquetación.',
    mTax: 'Obtener del fisco', mUpload: 'Subir archivos', mPhone: 'Captura móvil', mScan: 'Escáner', mMail: 'Reenvío por correo', mManual: 'Entrada manual',
    gTodo: 'Por completar', gCheck: 'Por revisar', gReady: 'Listo para importar', gBlocked: 'Retenido',
    nTodo: 'Faltan campos o hace falta una explicación. Complétalo aquí mismo.',
    nCheck: 'Se detectaron duplicados, fechas fuera de plazo o desajustes con el viaje.',
    nReady: 'Completo y conforme a las reglas de este lugar de emisión.',
    nBlocked: 'Estos archivos no entran en ninguna cola nacional hasta que asignes un lugar de emisión.',
    selected: 'Seleccionado', totalIn: 'Total en {c}', cancel: 'Cancelar', importN: 'Importar {n}', importAll: 'Importar',
    reassign: 'Reasignar', more: 'Más…', keepFile: '· sin volver a subir; se conservan archivo e imagen',
    geoLocked: 'Lugar de emisión · fijado', amount: 'Importe', origAmount: 'Moneda original (con impuestos)',
    faceFields: 'Campos del documento', attachments: 'Adjuntos', addAttachment: 'Añadir adjunto', image: 'Imagen del documento',
    convIn: 'En {c}', emptyIn: 'Aún no hay documentos de {c}', localRate: 'Moneda propia · sin conversión', locked: 'fijado al informe',
    availableN: '{n} países y regiones disponibles', reassignOne: 'Reasignando 1 documento · se conservan archivo e imagen',
    blockedSelected: '{n} de los seleccionados siguen pendientes y habrá que completarlos en el informe',
    blockedUnselected: '{n} siguen pendientes y no están seleccionados — el resto ya puede importarse'
  },
  ar: {
    title: 'استيراد الفواتير', railHead: 'مكان الإصدار', unattributed: 'غير محدد',
    unkSub: 'المنشأ غير واضح أو لا يطابق مكان التحميل', local: 'البلد المحلي', rate: 'السعر',
    taxLabel: 'الضريبة والنسب', noteLabel: 'متطلبات محلية',
    pendingN: ' بحاجة إلى معالجة', geos: ' دولة',
    addGeo: 'إضافة مكان إصدار', railFoot: 'مكان الإصدار يحدد الضريبة وطريقة التعرف والعملة. قد يشمل التقرير عدة أماكن.',
    pickTitle: 'اختر دولة أو منطقة', pickSub: 'ابحث بالاسم أو بالعملة أو بالضريبة.',
    searchPh: 'ابحث عن دولة / عملة / ضريبة', noMatch: 'لا توجد دولة مطابقة', close: 'إغلاق', all: 'الكل',
    uiLang: 'لغة الواجهة', langNote: 'تتبدل جميع الصفحات معًا. الصينية المبسطة والتقليدية والإنجليزية والإسبانية والعربية مترجمة بالكامل؛ أما البقية فمعروضة للتحقق من الأسماء الأصلية والتنسيق.',
    mTax: 'سحب من مصلحة الضرائب', mUpload: 'تحميل ملفات', mPhone: 'تصوير بالهاتف', mScan: 'ماسح ضوئي', mMail: 'تحويل بالبريد', mManual: 'إدخال يدوي',
    gTodo: 'بحاجة إلى استكمال', gCheck: 'بحاجة إلى مراجعة', gReady: 'جاهز للاستيراد', gBlocked: 'محتجز',
    nTodo: 'حقول ناقصة أو تحتاج إلى توضيح. أكملها هنا مباشرة.',
    nCheck: 'تم العثور على تكرار أو تواريخ خارج الفترة أو عدم تطابق مع الرحلة.',
    nReady: 'مكتمل ومطابق لقواعد مكان الإصدار.',
    nBlocked: 'لا تدخل هذه الملفات أي قائمة دولة حتى تحدد مكان الإصدار.',
    selected: 'المحدد', totalIn: 'الإجمالي بـ {c}', cancel: 'إلغاء', importN: 'استيراد {n}', importAll: 'استيراد',
    reassign: 'إعادة التحديد', more: 'المزيد…', keepFile: '· دون إعادة تحميل؛ يُحفظ الملف والصورة',
    geoLocked: 'مكان الإصدار · مثبّت', amount: 'المبلغ', origAmount: 'العملة الأصلية (مع الضريبة)',
    faceFields: 'حقول المستند', attachments: 'المرفقات', addAttachment: 'إضافة مرفق', image: 'صورة المستند',
    convIn: 'بـ {c}', emptyIn: 'لا توجد مستندات لـ {c} بعد', localRate: 'العملة المحلية · دون تحويل', locked: 'مثبّت مع التقرير',
    availableN: '{n} دولة ومنطقة متاحة', reassignOne: 'إعادة تحديد مستند واحد · يُحفظ الملف والصورة',
    blockedSelected: '{n} من المحدد ما زالت بحاجة إلى معالجة وستُستكمل داخل التقرير',
    blockedUnselected: '{n} بحاجة إلى معالجة وغير محددة — يمكن استيراد الباقي الآن'
  }
};

/* 部分词条：覆盖在英文之上，用于检验各语种的版式与字长 */
export const PARTIAL: Partial<Record<LangCode, Partial<UiText>>> = {
  ja: { title: '請求書の取込', railHead: '発生地', unattributed: '未割当', local: '自国', rate: 'レート',
    taxLabel: '税目・税率', noteLabel: '国別の注意', addGeo: '発生地を追加', pickTitle: '国・地域を選択',
    searchPh: '国・通貨・税目を検索', gTodo: '要補完', gCheck: '要確認', gReady: '取込可', gBlocked: '保留',
    selected: '選択', cancel: 'キャンセル', importAll: '取込', close: '閉じる', all: 'すべて', uiLang: '表示言語',
    importN: '{n} 件を取込', pendingN: '件要処理', geos: ' か国', mTax: '税務署から取得', mUpload: 'ファイル', mPhone: 'スマホ撮影', mScan: 'スキャナ', mMail: 'メール転送', mManual: '手入力' },
  ko: { title: '전표 가져오기', railHead: '발생지', unattributed: '미지정', local: '자국', rate: '환율',
    taxLabel: '세목 · 세율', noteLabel: '국가별 유의사항', addGeo: '발생지 추가', pickTitle: '국가/지역 선택',
    searchPh: '국가 · 통화 · 세목 검색', gTodo: '보완 필요', gCheck: '검토 필요', gReady: '가져오기 가능', gBlocked: '보류',
    selected: '선택', cancel: '취소', importAll: '가져오기', close: '닫기', all: '전체', uiLang: '표시 언어',
    importN: '{n}건 가져오기', pendingN: ' 건 처리 필요', geos: '개 국가', mTax: '세무서 조회', mUpload: '파일 업로드', mPhone: '휴대폰 촬영', mScan: '스캐너', mMail: '이메일 전달', mManual: '직접 입력' },
  th: { title: 'นำเข้าใบกำกับภาษี', railHead: 'สถานที่ออกเอกสาร', unattributed: 'ยังไม่ระบุ', local: 'ในประเทศ', rate: 'อัตรา',
    taxLabel: 'ภาษีและอัตรา', noteLabel: 'ข้อกำหนดในประเทศ', addGeo: 'เพิ่มสถานที่ออกเอกสาร', pickTitle: 'เลือกประเทศหรือภูมิภาค',
    searchPh: 'ค้นหาประเทศ / สกุลเงิน / ภาษี', gTodo: 'ต้องเติมข้อมูล', gCheck: 'ต้องตรวจสอบ', gReady: 'พร้อมนำเข้า', gBlocked: 'พักไว้',
    selected: 'เลือกแล้ว', cancel: 'ยกเลิก', importAll: 'นำเข้า', close: 'ปิด', all: 'ทั้งหมด', uiLang: 'ภาษาของอินเทอร์เฟซ',
    importN: 'นำเข้า {n}', pendingN: ' รายการต้องแก้', geos: ' ประเทศ', mTax: 'ดึงจากกรมสรรพากร', mUpload: 'อัปโหลดไฟล์', mPhone: 'ถ่ายด้วยมือถือ', mScan: 'สแกนเนอร์', mMail: 'ส่งต่อทางอีเมล', mManual: 'กรอกเอง' },
  vi: { title: 'Nhập hóa đơn', railHead: 'Nơi phát hành', unattributed: 'Chưa gán', local: 'Trong nước', rate: 'Tỷ giá',
    taxLabel: 'Thuế và thuế suất', noteLabel: 'Yêu cầu địa phương', addGeo: 'Thêm nơi phát hành', pickTitle: 'Chọn quốc gia hoặc khu vực',
    searchPh: 'Tìm quốc gia / tiền tệ / thuế', gTodo: 'Cần bổ sung', gCheck: 'Cần rà soát', gReady: 'Sẵn sàng nhập', gBlocked: 'Đang giữ',
    selected: 'Đã chọn', cancel: 'Hủy', importAll: 'Nhập', close: 'Đóng', all: 'Tất cả', uiLang: 'Ngôn ngữ giao diện',
    importN: 'Nhập {n}', pendingN: ' cần xử lý', geos: ' quốc gia', mTax: 'Lấy từ cơ quan thuế', mUpload: 'Tải tệp lên', mPhone: 'Chụp bằng điện thoại', mScan: 'Máy quét', mMail: 'Chuyển tiếp email', mManual: 'Nhập thủ công' },
  id: { title: 'Impor faktur', railHead: 'Tempat penerbitan', unattributed: 'Belum ditetapkan', local: 'Dalam negeri', rate: 'Kurs',
    taxLabel: 'Pajak dan tarif', noteLabel: 'Ketentuan setempat', addGeo: 'Tambah tempat penerbitan', pickTitle: 'Pilih negara atau wilayah',
    searchPh: 'Cari negara / mata uang / pajak', gTodo: 'Perlu dilengkapi', gCheck: 'Perlu ditinjau', gReady: 'Siap diimpor', gBlocked: 'Ditahan',
    selected: 'Dipilih', cancel: 'Batal', importAll: 'Impor', close: 'Tutup', all: 'Semua', uiLang: 'Bahasa antarmuka',
    importN: 'Impor {n}', pendingN: ' perlu ditangani', geos: ' negara', mTax: 'Ambil dari kantor pajak', mUpload: 'Unggah berkas', mPhone: 'Foto lewat ponsel', mScan: 'Pemindai', mMail: 'Teruskan email', mManual: 'Isi manual' },
  hi: { title: 'चालान आयात करें', railHead: 'जारी करने का स्थान', unattributed: 'अनिर्धारित', local: 'स्वदेश', rate: 'दर',
    taxLabel: 'कर और दरें', noteLabel: 'स्थानीय आवश्यकताएँ', addGeo: 'स्थान जोड़ें', pickTitle: 'देश या क्षेत्र चुनें',
    searchPh: 'देश / मुद्रा / कर खोजें', gTodo: 'पूरा करना है', gCheck: 'समीक्षा चाहिए', gReady: 'आयात के लिए तैयार', gBlocked: 'रोका गया',
    selected: 'चयनित', cancel: 'रद्द करें', importAll: 'आयात', close: 'बंद करें', all: 'सभी', uiLang: 'इंटरफ़ेस भाषा',
    importN: '{n} आयात करें', pendingN: ' पर काम बाकी', geos: ' देश', mTax: 'कर विभाग से लाएँ', mUpload: 'फ़ाइल अपलोड', mPhone: 'मोबाइल से फ़ोटो', mScan: 'स्कैनर', mMail: 'ईमेल फ़ॉरवर्ड', mManual: 'मैन्युअल प्रविष्टि' },
  fr: { title: 'Importer des factures', railHead: 'Lieu d\u2019émission', unattributed: 'Non attribué', local: 'National', rate: 'Taux',
    taxLabel: 'Taxe et taux', noteLabel: 'Exigences locales', addGeo: 'Ajouter un lieu d\u2019émission', pickTitle: 'Choisir un pays ou une région',
    searchPh: 'Rechercher pays / devise / taxe', gTodo: 'À compléter', gCheck: 'À vérifier', gReady: 'Prêt à importer', gBlocked: 'Retenu',
    selected: 'Sélectionné', cancel: 'Annuler', importAll: 'Importer', close: 'Fermer', all: 'Tous', uiLang: 'Langue de l\u2019interface',
    importN: 'Importer {n}', pendingN: ' à traiter', geos: ' pays', mTax: 'Récupérer au fisc', mUpload: 'Importer des fichiers', mPhone: 'Photo mobile', mScan: 'Scanner', mMail: 'Transfert e-mail', mManual: 'Saisie manuelle' },
  de: { title: 'Belege importieren', railHead: 'Ausstellungsort', unattributed: 'Nicht zugeordnet', local: 'Inland', rate: 'Kurs',
    taxLabel: 'Steuer und Sätze', noteLabel: 'Landesvorgaben', addGeo: 'Ausstellungsort hinzufügen', pickTitle: 'Land oder Region wählen',
    searchPh: 'Land / Währung / Steuer suchen', gTodo: 'Zu vervollständigen', gCheck: 'Zu prüfen', gReady: 'Importbereit', gBlocked: 'Zurückgehalten',
    selected: 'Ausgewählt', cancel: 'Abbrechen', importAll: 'Importieren', close: 'Schließen', all: 'Alle', uiLang: 'Oberflächensprache',
    importN: '{n} importieren', pendingN: ' zu bearbeiten', geos: ' Länder', mTax: 'Vom Finanzamt abrufen', mUpload: 'Dateien hochladen', mPhone: 'Handyaufnahme', mScan: 'Scanner', mMail: 'E-Mail-Weiterleitung', mManual: 'Manuelle Eingabe' },
  pt: { title: 'Importar faturas', railHead: 'Local de emissão', unattributed: 'Sem atribuição', local: 'Nacional', rate: 'Câmbio',
    taxLabel: 'Imposto e alíquotas', noteLabel: 'Exigências locais', addGeo: 'Adicionar local de emissão', pickTitle: 'Escolher país ou região',
    searchPh: 'Buscar país / moeda / imposto', gTodo: 'A completar', gCheck: 'A revisar', gReady: 'Pronto para importar', gBlocked: 'Retido',
    selected: 'Selecionado', cancel: 'Cancelar', importAll: 'Importar', close: 'Fechar', all: 'Todos', uiLang: 'Idioma da interface',
    importN: 'Importar {n}', pendingN: ' a resolver', geos: ' países', mTax: 'Buscar no fisco', mUpload: 'Enviar arquivos', mPhone: 'Captura por celular', mScan: 'Scanner', mMail: 'Encaminhar e-mail', mManual: 'Entrada manual' },
  it: { title: 'Importa fatture', railHead: 'Luogo di emissione', unattributed: 'Non assegnato', local: 'Nazionale', rate: 'Cambio',
    taxLabel: 'Imposta e aliquote', noteLabel: 'Requisiti locali', addGeo: 'Aggiungi luogo di emissione', pickTitle: 'Scegli paese o regione',
    searchPh: 'Cerca paese / valuta / imposta', gTodo: 'Da completare', gCheck: 'Da verificare', gReady: 'Pronto per l\u2019importazione', gBlocked: 'Trattenuto',
    selected: 'Selezionato', cancel: 'Annulla', importAll: 'Importa', close: 'Chiudi', all: 'Tutti', uiLang: 'Lingua dell\u2019interfaccia',
    importN: 'Importa {n}', pendingN: ' da sistemare', geos: ' paesi', mTax: 'Recupera dal fisco', mUpload: 'Carica file', mPhone: 'Scatto da telefono', mScan: 'Scanner', mMail: 'Inoltro e-mail', mManual: 'Inserimento manuale' },
  nl: { title: 'Facturen importeren', railHead: 'Plaats van uitgifte', unattributed: 'Niet toegewezen', local: 'Binnenland', rate: 'Koers',
    taxLabel: 'Belasting en tarieven', noteLabel: 'Lokale eisen', addGeo: 'Plaats van uitgifte toevoegen', pickTitle: 'Kies land of regio',
    searchPh: 'Zoek land / valuta / belasting', gTodo: 'Aan te vullen', gCheck: 'Te beoordelen', gReady: 'Klaar om te importeren', gBlocked: 'Aangehouden',
    selected: 'Geselecteerd', cancel: 'Annuleren', importAll: 'Importeren', close: 'Sluiten', all: 'Alle', uiLang: 'Interfacetaal',
    importN: '{n} importeren', pendingN: ' te behandelen', geos: ' landen', mTax: 'Ophalen bij Belastingdienst', mUpload: 'Bestanden uploaden', mPhone: 'Telefoonopname', mScan: 'Scanner', mMail: 'E-mail doorsturen', mManual: 'Handmatige invoer' },
  ru: { title: 'Импорт счетов', railHead: 'Место выставления', unattributed: 'Не определено', local: 'Своя страна', rate: 'Курс',
    taxLabel: 'Налог и ставки', noteLabel: 'Местные требования', addGeo: 'Добавить место выставления', pickTitle: 'Выберите страну или регион',
    searchPh: 'Поиск страны / валюты / налога', gTodo: 'Требует заполнения', gCheck: 'Требует проверки', gReady: 'Готово к импорту', gBlocked: 'Задержано',
    selected: 'Выбрано', cancel: 'Отмена', importAll: 'Импорт', close: 'Закрыть', all: 'Все', uiLang: 'Язык интерфейса',
    importN: 'Импорт: {n}', pendingN: ' требуют работы', geos: ' стран', mTax: 'Получить в налоговой', mUpload: 'Загрузить файлы', mPhone: 'Съёмка с телефона', mScan: 'Сканер', mMail: 'Пересылка по почте', mManual: 'Ручной ввод' },
  tr: { title: 'Fatura içe aktar', railHead: 'Düzenlenme yeri', unattributed: 'Atanmadı', local: 'Yurt içi', rate: 'Kur',
    taxLabel: 'Vergi ve oranlar', noteLabel: 'Yerel gereklilikler', addGeo: 'Düzenlenme yeri ekle', pickTitle: 'Ülke veya bölge seç',
    searchPh: 'Ülke / para birimi / vergi ara', gTodo: 'Tamamlanacak', gCheck: 'İncelenecek', gReady: 'İçe aktarmaya hazır', gBlocked: 'Bekletildi',
    selected: 'Seçili', cancel: 'İptal', importAll: 'İçe aktar', close: 'Kapat', all: 'Tümü', uiLang: 'Arayüz dili',
    importN: '{n} içe aktar', pendingN: ' işlem bekliyor', geos: ' ülke', mTax: 'Vergi dairesinden al', mUpload: 'Dosya yükle', mPhone: 'Telefonla çek', mScan: 'Tarayıcı', mMail: 'E-posta ilet', mManual: 'Elle giriş' }
};

const MSG_RAW = {
  zh: {
    needPax: '待补：入住人与出差事由未填',
    dup: '疑似重复：与 {a} 同车场、同金额，间隔 2 天',
    langKR: '在「日本」上传，但票面文字为韩语，已拦截',
    ambNL: '开票主体在荷兰、服务发生在日本，发生地存在歧义',
    twoInOne: '一张图内检出中日两地票据，需拆分',
    tax: '补 消費税額', sellerTax: '补 登録番号', seller: '补 销方名称', no: '补 票据号码',
    date: '补 开票日期', amt: '补 金额', noInvoice: '无票据 · 需说明',
    matched: '已匹配 {a}', unmatched: '未匹配费用明细', complete: '字段完整',
    verifiedFull: '已查验 · 真票 · 未验重冲红', verified: '已查验 · 真票'
  },
  'zh-TW': {
    needPax: '待補：住宿人與出差事由未填',
    dup: '疑似重複：與 {a} 同停車場、同金額，相隔 2 天',
    langKR: '在「日本」上傳，但票面文字為韓文，已攔截',
    ambNL: '開票主體在荷蘭、服務發生在日本，發生地存在歧義',
    twoInOne: '一張圖內偵測到中日兩地票據，需拆分',
    tax: '補 消費稅額', sellerTax: '補 登錄番號', seller: '補 銷方名稱', no: '補 票據號碼',
    date: '補 開票日期', amt: '補 金額', noInvoice: '無票據 · 需說明',
    matched: '已配對 {a}', unmatched: '未配對費用明細', complete: '欄位完整',
    verifiedFull: '已查驗 · 真票 · 未重複沖紅', verified: '已查驗 · 真票'
  },
  en: {
    needPax: 'Add guest name and trip purpose',
    dup: 'Possible duplicate — same lot and amount as {a}, 2 days apart',
    langKR: 'Uploaded under Japan, but the document is in Korean — held',
    ambNL: 'Issuer in the Netherlands, service in Japan — place of issue ambiguous',
    twoInOne: 'Two countries in one image — needs splitting',
    tax: 'Add consumption tax', sellerTax: 'Add registration no.', seller: 'Add supplier',
    no: 'Add document no.', date: 'Add date', amt: 'Add amount',
    noInvoice: 'No document — explanation required',
    matched: 'Matched {a}', unmatched: 'No expense line matched', complete: 'Complete',
    verifiedFull: 'Verified · authentic · no duplicate or void', verified: 'Verified · authentic'
  },
  es: {
    needPax: 'Falta huésped y motivo del viaje',
    dup: 'Posible duplicado: mismo aparcamiento e importe que {a}, 2 días después',
    langKR: 'Cargado en Japón, pero el documento está en coreano — retenido',
    ambNL: 'Emisor en Países Bajos, servicio en Japón — lugar ambiguo',
    twoInOne: 'Documentos de dos países en una imagen — hay que separarlos',
    tax: 'Añadir impuesto', sellerTax: 'Añadir n.º de registro', seller: 'Añadir proveedor',
    no: 'Añadir n.º de documento', date: 'Añadir fecha', amt: 'Añadir importe',
    noInvoice: 'Sin documento — se requiere explicación',
    matched: 'Vinculado a {a}', unmatched: 'Sin línea de gasto vinculada', complete: 'Completo',
    verifiedFull: 'Verificado · auténtico · sin duplicado', verified: 'Verificado · auténtico'
  },
  ar: {
    needPax: 'أضف اسم المقيم وسبب الرحلة',
    dup: 'تكرار محتمل: نفس الموقف والمبلغ مثل {a} بفارق يومين',
    langKR: 'تم تحميله ضمن اليابان، لكن المستند بالكورية — محتجز',
    ambNL: 'المُصدر في هولندا والخدمة في اليابان — مكان الإصدار غير محدد',
    twoInOne: 'مستندان من دولتين في صورة واحدة — يجب فصلهما',
    tax: 'أضف الضريبة', sellerTax: 'أضف رقم التسجيل', seller: 'أضف المورّد',
    no: 'أضف رقم المستند', date: 'أضف التاريخ', amt: 'أضف المبلغ',
    noInvoice: 'لا يوجد مستند — مطلوب توضيح',
    matched: 'مطابق لـ {a}', unmatched: 'لا يوجد بند مصروف مطابق', complete: 'مكتمل',
    verifiedFull: 'تم التحقق · أصلي · لا تكرار', verified: 'تم التحقق · أصلي'
  }
};

/* 国家 → 手机端语言。扫码打开的页面用票据发生地的语言，不跟随电脑界面语言 */
export const LANG_OF: Partial<Record<string, LangCode>> = { CN: 'zh', HK: 'zh-TW', JP: 'ja', KR: 'ko', TH: 'th', VN: 'vi', ID: 'id', IN: 'hi',
  FR: 'fr', DE: 'de', CH: 'de', BR: 'pt', ES: 'es', MX: 'es', IT: 'it', NL: 'nl', TR: 'tr', AE: 'ar', SA: 'ar' };

/* 手机端文案。覆盖 17 种语言，缺省回落英文 */
const MOBILE_RAW = {
  zh: { idleTitle: '等待扫码', idleBody: '用手机相机或 Chrome 扫描电脑上的二维码，即可打开拍票页面。', camHint: '对准票面四角，避免反光。可连拍多张。', shotN: '已拍 {n} 张', resultTitle: '识别结果', retake: '重拍', use: '使用这张', fAmount: '价税合计', fTax: '税额', confirm: '按 10% 反算', resultNote: '识别在该国规则下完成，字段可在电脑端继续核对。', sentTitle: '已回传电脑', sentBody: '票据已进入电脑端的对应国家分组，可继续拍下一张。', again: '继续拍摄' },
  'zh-TW': { idleTitle: '等待掃碼', idleBody: '用手機相機或 Chrome 掃描電腦上的二維碼，即可開啟拍票頁面。', camHint: '對準票面四角，避免反光。可連拍多張。', shotN: '已拍 {n} 張', resultTitle: '識別結果', retake: '重拍', use: '使用這張', fAmount: '價稅合計', fTax: '稅額', confirm: '按 10% 反算', resultNote: '識別依該地規則完成，欄位可在電腦端繼續核對。', sentTitle: '已回傳電腦', sentBody: '票據已進入電腦端對應的國家分組，可繼續拍下一張。', again: '繼續拍攝' },
  en: { idleTitle: 'Waiting for scan', idleBody: 'Scan the code on your computer with the camera or Chrome to open the capture page.', camHint: 'Line up all four corners and avoid glare. You can shoot several.', shotN: '{n} captured', resultTitle: 'Recognition result', retake: 'Retake', use: 'Use this one', fAmount: 'Total', fTax: 'Tax', confirm: 'Derive at 10%', resultNote: 'Read under this country’s rules. Fields stay editable on the computer.', sentTitle: 'Sent to computer', sentBody: 'It has joined the matching country group on the computer. Keep shooting.', again: 'Capture another' },
  ja: { idleTitle: 'スキャン待ち', idleBody: 'パソコンのQRコードをカメラまたは Chrome で読み取ると撮影画面が開きます。', camHint: '四隅を枠に合わせ、反射を避けてください。連続撮影できます。', shotN: '{n} 件撮影', resultTitle: '読取結果', retake: '撮り直す', use: 'これを使う', fAmount: '合計（税込）', fTax: '消費税額', confirm: '10% で逆算', resultNote: '適格請求書等の規則で読み取りました。項目はパソコンで確認できます。', sentTitle: 'パソコンに送信しました', sentBody: 'パソコン側の該当国グループに入りました。続けて撮影できます。', again: '続けて撮影' },
  ko: { idleTitle: '스캔 대기 중', idleBody: '컴퓨터의 QR 코드를 카메라나 Chrome으로 스캔하면 촬영 화면이 열립니다.', camHint: '네 모서리를 맞추고 반사를 피하세요. 연속 촬영이 가능합니다.', shotN: '{n}장 촬영', resultTitle: '인식 결과', retake: '다시 촬영', use: '이 장 사용', fAmount: '합계', fTax: '부가세', confirm: '10% 역산', resultNote: '해당 국가 규칙으로 인식했습니다. 항목은 PC에서 확인할 수 있습니다.', sentTitle: 'PC로 전송됨', sentBody: 'PC의 해당 국가 그룹에 들어갔습니다. 계속 촬영하세요.', again: '계속 촬영' },
  th: { idleTitle: 'รอการสแกน', idleBody: 'สแกนคิวอาร์โค้ดบนคอมพิวเตอร์ด้วยกล้องหรือ Chrome เพื่อเปิดหน้าถ่ายเอกสาร', camHint: 'จัดให้ครบทั้งสี่มุมและเลี่ยงแสงสะท้อน ถ่ายได้หลายใบ', shotN: 'ถ่ายแล้ว {n} ใบ', resultTitle: 'ผลการอ่าน', retake: 'ถ่ายใหม่', use: 'ใช้ใบนี้', fAmount: 'รวมทั้งสิ้น', fTax: 'ภาษี', confirm: 'คำนวณ 7%', resultNote: 'อ่านตามกฎของประเทศนี้ แก้ไขได้บนคอมพิวเตอร์', sentTitle: 'ส่งไปยังคอมพิวเตอร์แล้ว', sentBody: 'เข้ากลุ่มประเทศที่ตรงกันแล้ว ถ่ายต่อได้', again: 'ถ่ายต่อ' },
  vi: { idleTitle: 'Đang chờ quét', idleBody: 'Quét mã trên máy tính bằng camera hoặc Chrome để mở trang chụp hóa đơn.', camHint: 'Canh đủ bốn góc, tránh lóa. Có thể chụp nhiều tờ.', shotN: 'Đã chụp {n}', resultTitle: 'Kết quả nhận dạng', retake: 'Chụp lại', use: 'Dùng tờ này', fAmount: 'Tổng cộng', fTax: 'Thuế', confirm: 'Suy ra 10%', resultNote: 'Đọc theo quy định của nước này. Có thể sửa trên máy tính.', sentTitle: 'Đã gửi về máy tính', sentBody: 'Đã vào nhóm quốc gia tương ứng. Tiếp tục chụp.', again: 'Chụp tiếp' },
  id: { idleTitle: 'Menunggu pemindaian', idleBody: 'Pindai kode di komputer dengan kamera atau Chrome untuk membuka halaman foto.', camHint: 'Sejajarkan keempat sudut dan hindari pantulan. Bisa beberapa lembar.', shotN: '{n} diambil', resultTitle: 'Hasil pengenalan', retake: 'Ambil ulang', use: 'Pakai ini', fAmount: 'Total', fTax: 'Pajak', confirm: 'Hitung 11%', resultNote: 'Dibaca dengan aturan negara ini. Bisa diubah di komputer.', sentTitle: 'Terkirim ke komputer', sentBody: 'Sudah masuk grup negara yang sesuai. Lanjutkan memfoto.', again: 'Foto lagi' },
  hi: { idleTitle: 'स्कैन की प्रतीक्षा', idleBody: 'कंप्यूटर पर दिख रहे कोड को कैमरा या Chrome से स्कैन करें।', camHint: 'चारों कोने फ्रेम में रखें और चमक से बचें। कई पर्चियाँ ले सकते हैं।', shotN: '{n} लिए गए', resultTitle: 'पहचान परिणाम', retake: 'फिर लें', use: 'यही उपयोग करें', fAmount: 'कुल', fTax: 'कर', confirm: '18% से निकालें', resultNote: 'इस देश के नियमों से पढ़ा गया। कंप्यूटर पर बदल सकते हैं।', sentTitle: 'कंप्यूटर पर भेजा गया', sentBody: 'संबंधित देश समूह में चला गया। और लेते रहें।', again: 'और लें' },
  fr: { idleTitle: 'En attente du scan', idleBody: 'Scannez le code affiché sur l’ordinateur avec l’appareil photo ou Chrome.', camHint: 'Cadrez les quatre coins et évitez les reflets. Plusieurs prises possibles.', shotN: '{n} pris', resultTitle: 'Résultat de lecture', retake: 'Reprendre', use: 'Utiliser celui-ci', fAmount: 'Total TTC', fTax: 'TVA', confirm: 'Déduire à 20%', resultNote: 'Lu selon les règles du pays. Modifiable sur l’ordinateur.', sentTitle: 'Envoyé à l’ordinateur', sentBody: 'Rejoint le groupe du pays correspondant. Continuez.', again: 'Reprendre une photo' },
  de: { idleTitle: 'Warten auf Scan', idleBody: 'Scannen Sie den Code am Rechner mit der Kamera oder Chrome.', camHint: 'Alle vier Ecken erfassen, Spiegelungen vermeiden. Mehrere Aufnahmen möglich.', shotN: '{n} erfasst', resultTitle: 'Erkennungsergebnis', retake: 'Neu aufnehmen', use: 'Diese verwenden', fAmount: 'Bruttobetrag', fTax: 'MwSt.', confirm: 'Mit 19% ableiten', resultNote: 'Nach den Regeln dieses Landes gelesen. Am Rechner änderbar.', sentTitle: 'An den Rechner gesendet', sentBody: 'In der passenden Ländergruppe angekommen. Weiter aufnehmen.', again: 'Weiter aufnehmen' },
  es: { idleTitle: 'Esperando el escaneo', idleBody: 'Escanea el código del ordenador con la cámara o Chrome para abrir la captura.', camHint: 'Encuadra las cuatro esquinas y evita reflejos. Puedes hacer varias.', shotN: '{n} capturadas', resultTitle: 'Resultado del reconocimiento', retake: 'Volver a tomar', use: 'Usar esta', fAmount: 'Total', fTax: 'IVA', confirm: 'Deducir al 21%', resultNote: 'Leído con las reglas del país. Editable en el ordenador.', sentTitle: 'Enviado al ordenador', sentBody: 'Ya está en el grupo del país correspondiente. Sigue capturando.', again: 'Capturar otra' },
  pt: { idleTitle: 'Aguardando leitura', idleBody: 'Leia o código do computador com a câmera ou o Chrome para abrir a captura.', camHint: 'Enquadre os quatro cantos e evite reflexos. Pode tirar várias.', shotN: '{n} capturadas', resultTitle: 'Resultado da leitura', retake: 'Tirar de novo', use: 'Usar esta', fAmount: 'Total', fTax: 'Imposto', confirm: 'Deduzir a 18%', resultNote: 'Lido pelas regras do país. Editável no computador.', sentTitle: 'Enviado ao computador', sentBody: 'Entrou no grupo do país correspondente. Continue capturando.', again: 'Capturar outra' },
  it: { idleTitle: 'In attesa della scansione', idleBody: 'Inquadra il codice sul computer con la fotocamera o Chrome.', camHint: 'Inquadra i quattro angoli ed evita i riflessi. Puoi scattare più volte.', shotN: '{n} acquisite', resultTitle: 'Esito del riconoscimento', retake: 'Riscatta', use: 'Usa questa', fAmount: 'Totale', fTax: 'IVA', confirm: 'Ricava al 22%', resultNote: 'Letto con le regole del paese. Modificabile sul computer.', sentTitle: 'Inviata al computer', sentBody: 'È entrata nel gruppo del paese corrispondente. Continua.', again: 'Scatta ancora' },
  nl: { idleTitle: 'Wachten op scan', idleBody: 'Scan de code op de computer met de camera of Chrome.', camHint: 'Alle vier hoeken in beeld, vermijd spiegeling. Meerdere opnamen mogelijk.', shotN: '{n} opgenomen', resultTitle: 'Herkenningsresultaat', retake: 'Opnieuw', use: 'Deze gebruiken', fAmount: 'Totaal', fTax: 'BTW', confirm: 'Bereken 21%', resultNote: 'Gelezen volgens de regels van dit land. Aanpasbaar op de computer.', sentTitle: 'Naar de computer gestuurd', sentBody: 'Staat in de juiste landengroep. Ga verder met opnemen.', again: 'Nog een opname' },
  ar: { idleTitle: 'في انتظار المسح', idleBody: 'امسح الرمز الظاهر على الحاسب بالكاميرا أو Chrome لفتح صفحة التصوير.', camHint: 'اضبط الزوايا الأربع وتجنّب الانعكاس. يمكن تصوير عدة مستندات.', shotN: 'تم تصوير {n}', resultTitle: 'نتيجة القراءة', retake: 'إعادة التصوير', use: 'استخدام هذه', fAmount: 'الإجمالي', fTax: 'الضريبة', confirm: 'احتساب 5%', resultNote: 'تمت القراءة وفق قواعد هذه الدولة. يمكن التعديل على الحاسب.', sentTitle: 'أُرسلت إلى الحاسب', sentBody: 'دخلت مجموعة الدولة المطابقة. تابع التصوير.', again: 'تصوير آخر' },
  tr: { idleTitle: 'Tarama bekleniyor', idleBody: 'Bilgisayardaki kodu kamera veya Chrome ile taratın.', camHint: 'Dört köşeyi çerçeveleyin, parlamadan kaçının. Birkaç çekim yapabilirsiniz.', shotN: '{n} çekildi', resultTitle: 'Tanıma sonucu', retake: 'Yeniden çek', use: 'Bunu kullan', fAmount: 'Toplam', fTax: 'KDV', confirm: '%20 ile hesapla', resultNote: 'Bu ülkenin kurallarıyla okundu. Bilgisayarda düzenlenebilir.', sentTitle: 'Bilgisayara gönderildi', sentBody: 'İlgili ülke grubuna girdi. Çekmeye devam edin.', again: 'Yeniden çek' }
};

/* 二维码弹窗（电脑侧）文案 */
const QRT_RAW = {
  zh: { title: '手机拍票', sub: '扫码在手机上打开拍票页面，拍完自动回传到本页对应的国家分组。',
    chrome: '请用 Chrome 扫码打开。其他浏览器（含部分 App 内置浏览器）可能无法调用摄像头。',
    geoLabel: '发生地', localeLabel: '手机端语言', apiLabel: '识别接口', expire: '二维码 5 分钟内有效',
    s1: '手机扫码，允许摄像头权限', s2: '按该国规则拍摄票据', s3: '手机上确认识别结果', s4: '回传到本页对应分组',
    stWaiting: '等待扫码', stCam: '已连接', stResult: '识别完成', stDone: '已回传',
    simScan: '模拟扫码', simShoot: '模拟拍摄', simSend: '模拟回传', reopen: '再拍一张',
    foot: '手机与电脑共用同一会话：发生地、语言与识别接口均由本页决定',
    phoneCaption: '手机端 · 扫码后打开',
    phoneFoot: '扫码打开的是同一会话的另一台设备，所以在设计里作为并列的第二块屏呈现：左侧电脑决定规则，右侧手机执行拍摄。手机端语言取票据发生地，与电脑界面语言相互独立。' },
  en: { title: 'Phone capture', sub: 'Scan to open the capture page on your phone; shots return to this country group automatically.',
    chrome: 'Open the code in Chrome. Other browsers — including in-app ones — may not reach the camera.',
    geoLabel: 'Place of issue', localeLabel: 'Phone language', apiLabel: 'OCR endpoint', expire: 'Code valid for 5 minutes',
    s1: 'Scan and allow camera access', s2: 'Shoot under this country’s rules', s3: 'Confirm the reading on the phone', s4: 'Returns to this group',
    stWaiting: 'Waiting for scan', stCam: 'Connected', stResult: 'Read', stDone: 'Returned',
    simScan: 'Simulate scan', simShoot: 'Simulate capture', simSend: 'Simulate return', reopen: 'Capture another',
    foot: 'Phone and desktop share one session: place of issue, language and endpoint come from this page',
    phoneCaption: 'Phone · opened by scan',
    phoneFoot: 'The scanned page is a second device on the same session, so it is drawn as a second screen beside the desktop: the computer sets the rules, the phone does the shooting. Its language follows the place of issue, not the desktop UI.' }
};

export type UiText = typeof I18N_RAW.zh;
export type MsgKey = keyof typeof MSG_RAW.zh;
export type MsgText = Record<MsgKey, string>;
export type MobileText = typeof MOBILE_RAW.en;
export type QrText = typeof QRT_RAW.en;

export const I18N: Record<FullUiLang, UiText> = I18N_RAW;
export const MSG: Record<FullUiLang, MsgText> = MSG_RAW;
export const MOBILE: Partial<Record<LangCode, MobileText>> = MOBILE_RAW;
export const QRT: Partial<Record<LangCode, QrText>> = QRT_RAW;

/** 中日文界面：数量带量词（张 / 件），国家名用中文 */
export const CJK: Partial<Record<LangCode, true>> = { zh: true, 'zh-TW': true, ja: true };

function isFullUi(l: LangCode): l is FullUiLang {
  return l === 'zh' || l === 'zh-TW' || l === 'en' || l === 'es' || l === 'ar';
}

/** 界面文案：完整翻译直接取；其余语言 = 英文 + 部分词条覆盖 */
export function uiText(lang: LangCode): UiText {
  if (isFullUi(lang)) return I18N[lang];
  return { ...I18N.en, ...(PARTIAL[lang] ?? {}) };
}

/** 票据提示词条：缺省回落英文，再回落中文 */
export function msgText(lang: LangCode, k: MsgKey): string {
  const M = isFullUi(lang) ? MSG[lang] : MSG.en;
  return M[k] || MSG.en[k] || MSG.zh[k] || k;
}

/** 二维码弹窗文案（电脑侧）：仅中英，缺省英文 */
export function qrText(lang: LangCode): QrText {
  return QRT[lang] ?? QRT_RAW.en;
}

/** 手机端文案：按票据发生地语言，缺省英文 */
export function mobileText(lang: LangCode): MobileText {
  return MOBILE[lang] ?? MOBILE_RAW.en;
}

/** 词条占位替换：fill('导入 {n} 张', 'n', 3) */
export function fill(s: string, k: string, v: string | number): string {
  return s.split('{' + k + '}').join(String(v));
}
