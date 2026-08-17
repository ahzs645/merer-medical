export type InterfaceLanguage = 'en' | 'ar';

export const INTERFACE_LANGUAGE_STORAGE_KEY = 'mere.interfaceLanguage';

export const interfaceLanguages: {
  code: InterfaceLanguage;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
];

export const arabicTranslations: Record<string, string> = {
  About: 'حول',
  'About me': 'نبذة عني',
  'About Mere Medical': 'حول مير ميديكال',
  Add: 'إضافة',
  'Add eye-care record': 'إضافة سجل رعاية عينية',
  'Add Connection': 'إضافة اتصال',
  'Add Document': 'إضافة مستند',
  'Add Health Record': 'إضافة سجل صحي',
  'Add lab row': 'إضافة صف مختبر',
  'Add Record': 'إضافة سجل',
  'Add record': 'إضافة سجل',
  'Add User Details': 'إضافة تفاصيل المستخدم',
  'Add a connection': 'إضافة اتصال',
  'Add a new record': 'إضافة سجل جديد',
  'Add document': 'إضافة مستند',
  'Add new user': 'إضافة مستخدم جديد',
  'Add at least one lab result.': 'أضف نتيجة مختبر واحدة على الأقل.',
  All: 'الكل',
  'All imaging': 'كل التصوير',
  'All lab results': 'كل نتائج المختبر',
  Allergies: 'الحساسيات',
  Allergy: 'حساسية',
  Alerts: 'التنبيهات',
  Arabic: 'العربية',
  Assistant: 'المساعد',
  Back: 'رجوع',
  'Birth Date': 'تاريخ الميلاد',
  Birthday: 'تاريخ الميلاد',
  'Blood Counts': 'تعداد الدم',
  Australian: 'الأسترالي',
  Bookmarked: 'المحفوظة',
  'Blood glucose': 'سكر الدم',
  'Body temperature': 'درجة حرارة الجسم',
  'Body weight': 'وزن الجسم',
  'CBC, platelets, hemoglobin, hematocrit, and white cells.':
    'تعداد الدم الكامل والصفائح والهيموغلوبين والهيماتوكريت وخلايا الدم البيضاء.',
  Cancel: 'إلغاء',
  Canadian: 'الكندي',
  'Care Plans': 'خطط الرعاية',
  'Choose File': 'اختيار ملف',
  'Choose the language used for menus, headings, and app copy.':
    'اختر اللغة المستخدمة للقوائم والعناوين ونصوص التطبيق.',
  Clear: 'مسح',
  'Clear all': 'مسح الكل',
  Close: 'إغلاق',
  'Close notifications': 'إغلاق الإشعارات',
  Conditions: 'الحالات',
  Connect: 'اتصال',
  Connection: 'اتصال',
  Connections: 'الاتصالات',
  Continue: 'متابعة',
  Date: 'التاريخ',
  'Date range': 'نطاق التاريخ',
  Delete: 'حذف',
  Details: 'التفاصيل',
  'Display language': 'لغة العرض',
  'DICOM scans': 'فحوصات DICOM',
  Diagnoses: 'التشخيصات',
  Developer: 'المطور',
  'Developer Settings': 'إعدادات المطور',
  Device: 'الجهاز',
  'Document / file': 'مستند / ملف',
  Done: 'تم',
  'Dismiss notification': 'تجاهل الإشعار',
  Dose: 'الجرعة',
  Download: 'تنزيل',
  Edit: 'تعديل',
  'Synced from a connected source — edit it there':
    'تمت المزامنة من مصدر متصل — عدّله هناك',
  'Edit record': 'تعديل السجل',
  Email: 'البريد الإلكتروني',
  'Enable encrypted storage with password protection':
    'تفعيل التخزين المشفر مع الحماية بكلمة مرور',
  'Enable password protection of your medical records. Will require you to provide a password before accessing any medical records.':
    'فعّل حماية سجلاتك الطبية بكلمة مرور. ستحتاج إلى إدخال كلمة مرور قبل الوصول إلى أي سجلات طبية.',
  English: 'الإنجليزية',
  Experimental: 'تجريبي',
  'Experimental Settings': 'الإعدادات التجريبية',
  Export: 'تصدير',
  'Family Name': 'اسم العائلة',
  Finish: 'إنهاء',
  'Start fresh': 'ابدأ من جديد',
  'Import existing .emrpkg': 'استيراد ملف .emrpkg موجود',
  'Already have a Mere profile? Import your .emrpkg file.':
    'هل لديك ملف شخصي في مير؟ استورد ملف .emrpkg الخاص بك.',
  File: 'الملف',
  'Discard unsaved changes?': 'هل تريد تجاهل التغييرات غير المحفوظة؟',
  'First Name': 'الاسم الأول',
  Flag: 'العلامة',
  French: 'الفرنسية',
  Frequency: 'التكرار',
  Gender: 'الجنس',
  'Given Name': 'الاسم المعطى',
  'Health Records': 'السجلات الصحية',
  'Heart rate': 'معدل ضربات القلب',
  High: 'مرتفع',
  'Glucose & Endocrine': 'الجلوكوز والغدد الصماء',
  'Glucose, A1c, insulin, thyroid, and hormone-related labs.':
    'الجلوكوز وA1c والأنسولين والغدة الدرقية والفحوصات المرتبطة بالهرمونات.',
  Imaging: 'التصوير',
  'Imaging reports, X-rays, DICOM studies, photos, and scan files will appear here when they are synced or added.':
    'ستظهر هنا تقارير التصوير والأشعة السينية ودراسات DICOM والصور وملفات الفحص عند مزامنتها أو إضافتها.',
  'imaging or device reports': 'تقارير تصوير أو أجهزة',
  '{count} eye-care records': '{count} سجل رعاية بصرية',
  '{count} imaging or device reports': '{count} تقرير تصوير أو أجهزة',
  'Exam measurements': 'قياسات الفحص',
  Eye: 'العين',
  Values: 'القيم',
  Severity: 'الخطورة',
  Code: 'الرمز',
  Dentition: 'الإطباق',
  'Visual acuity, IOP, refraction, OCT, visual field, and topography metrics will appear here as eye-specific Observations.':
    'ستظهر هنا قياسات حدة الإبصار وضغط العين والانكسار وOCT والمجال البصري والتضاريس كملاحظات خاصة بالعين.',
  'Showing {visible} of {total} records': 'عرض {visible} من {total} سجلات',
  'Something went wrong while loading records.': 'حدث خطأ أثناء تحميل السجلات.',
  'Unable to load optometry records.': 'تعذر تحميل سجلات البصريات.',
  'Unable to load dental records.': 'تعذر تحميل سجلات الأسنان.',
  'imaging records': 'سجلات تصوير',
  'Inflammation & Immunity': 'الالتهاب والمناعة',
  'Inflammatory, autoimmune, infectious, and immune markers.':
    'مؤشرات الالتهاب والمناعة الذاتية والعدوى والمناعة.',
  Import: 'استيراد',
  Immunizations: 'التحصينات',
  'Install the App': 'تثبيت التطبيق',
  'Install the Mere App on your Computer': 'تثبيت تطبيق مير على جهاز الكمبيوتر',
  'Installation Instructions': 'تعليمات التثبيت',
  'Interface language': 'لغة الواجهة',
  Language: 'اللغة',
  'Last Name': 'اسم العائلة',
  'Lab / result': 'مختبر / نتيجة',
  'Lab test': 'فحص المختبر',
  Labs: 'المختبرات',
  Latest: 'الأحدث',
  Lipids: 'الدهون',
  'Labs that do not match one of the common sections.':
    'الفحوصات التي لا تطابق أحد الأقسام الشائعة.',
  'Cholesterol, triglycerides, HDL, LDL, and related markers.':
    'الكوليسترول والدهون الثلاثية وHDL وLDL والمؤشرات ذات الصلة.',
  'LibreView file': 'ملف LibreView',
  Linked: 'مرتبط',
  'Linked report': 'التقرير المرتبط',
  Loading: 'جار التحميل',
  'Loading imaging records...': 'جار تحميل سجلات التصوير...',
  'Loading optometry records...': 'جار تحميل سجلات البصريات...',
  'Loading...': 'جار التحميل...',
  'Manual Entry': 'إدخال يدوي',
  Medications: 'الأدوية',
  Medication: 'دواء',
  'Metabolic Panel': 'لوحة التمثيل الغذائي',
  'Electrolytes, kidney function, liver enzymes, and proteins.':
    'الشوارد ووظائف الكلى وإنزيمات الكبد والبروتينات.',
  'Mere Assistant': 'مساعد مير',
  'Mark all read': 'وضع علامة مقروء على الكل',
  Name: 'الاسم',
  'New Record': 'سجل جديد',
  Next: 'التالي',
  'No lab groups match': 'لا توجد مجموعات مختبر تطابق',
  'No matching imaging records': 'لا توجد سجلات تصوير مطابقة',
  'No matching labs': 'لا توجد مختبرات مطابقة',
  'No records found': 'لم يتم العثور على سجلات',
  'No value': 'لا توجد قيمة',
  Notes: 'ملاحظات',
  Notifications: 'الإشعارات',
  'Ocular diagnosis': 'تشخيص عيني',
  'Optical retail order': 'طلب متجر البصريات',
  Optometry: 'البصريات',
  'Other Labs': 'مختبرات أخرى',
  'Oxygen saturation': 'تشبع الأكسجين',
  Original: 'الأصلي',
  Password: 'كلمة المرور',
  Prescriptions: 'الوصفات',
  Previous: 'السابق',
  'Privacy and Security': 'الخصوصية والأمان',
  'Record added': 'تمت إضافة السجل',
  'Record added — ready for the next one':
    'تمت إضافة السجل — جاهز للسجل التالي',
  'Record deleted': 'تم حذف السجل',
  'Record updated': 'تم تحديث السجل',
  'record added this session': 'سجل أضيف في هذه الجلسة',
  'records added': 'سجلات أضيفت',
  'records added this session': 'سجلات أضيفت في هذه الجلسة',
  'Delete this manual record?': 'هل تريد حذف هذا السجل اليدوي؟',
  'Unable to delete record': 'تعذر حذف السجل',
  'Unable to load record': 'تعذر تحميل السجل',
  'Unable to add record': 'تعذر إضافة السجل',
  'Unable to load linked files': 'تعذر تحميل الملفات المرتبطة',
  'Open source': 'فتح المصدر',
  Deleting: 'جار الحذف',
  'Document added — opening it': 'تمت إضافة المستند — جار فتحه',
  'FreeStyle Libre readings imported': 'قراءات FreeStyle Libre تم استيرادها',
  Records: 'السجلات',
  Reference: 'المرجع',
  'Reference standard': 'المعيار المرجعي',
  Refractions: 'الانكسارات',
  Remove: 'إزالة',
  Results: 'النتائج',
  results: 'نتائج',
  Reports: 'التقارير',
  Route: 'طريقة الإعطاء',
  Save: 'حفظ',
  Search: 'بحث',
  'Search imaging records': 'البحث في سجلات التصوير',
  'Search lab name or code': 'البحث باسم فحص المختبر أو رمزه',
  'Search labs': 'البحث في المختبرات',
  'Search records': 'البحث في السجلات',
  'Search scans, reports, modality, body site':
    'البحث في الفحوصات أو التقارير أو نوع التصوير أو موضع الجسم',
  Select: 'تحديد',
  Section: 'القسم',
  Settings: 'الإعدادات',
  Scans: 'الفحوصات',
  'Skip Tutorial': 'تخطي الدليل',
  'Some patient portals cannot communicate directly with Mere. This option enables a seperate proxy service to handle login and sync for Mere. Disabling this setting will increase privacy but can break some connections.':
    'لا تستطيع بعض بوابات المرضى التواصل مباشرة مع مير. يفعّل هذا الخيار خدمة وسيطة منفصلة للتعامل مع تسجيل الدخول والمزامنة. قد يؤدي تعطيل هذا الإعداد إلى زيادة الخصوصية ولكنه قد يعطل بعض الاتصالات.',
  Source: 'المصدر',
  Status: 'الحالة',
  Summary: 'الملخص',
  'Table ranges and high/low status update against the selected standard.':
    'تتحدث نطاقات الجدول وحالة الارتفاع أو الانخفاض حسب المعيار المحدد.',
  'Switch user': 'تبديل المستخدم',
  Sync: 'مزامنة',
  Terminology: 'المصطلحات',
  'Terminology Settings': 'إعدادات المصطلحات',
  Timeline: 'الخط الزمني',
  Title: 'العنوان',
  Type: 'النوع',
  Unit: 'الوحدة',
  UK: 'المملكة المتحدة',
  'Urine & Kidney Markers': 'البول ومؤشرات الكلى',
  'Urinalysis, urine chemistry, albumin, and protein markers.':
    'تحليل البول وكيمياء البول والألبومين ومؤشرات البروتين.',
  'Unknown User': 'مستخدم غير معروف',
  Update: 'تحديث',
  Upload: 'رفع',
  'Use proxy to sync data': 'استخدام وسيط لمزامنة البيانات',
  User: 'المستخدم',
  'User Data': 'بيانات المستخدم',
  View: 'عرض',
  'View details': 'عرض التفاصيل',
  'Vitamins & Nutrition': 'الفيتامينات والتغذية',
  'Iron, ferritin, vitamins, B12, folate, and nutrition labs.':
    'الحديد والفريتين والفيتامينات وB12 والفولات وفحوصات التغذية.',
  'X-rays': 'الأشعة السينية',
  'Welcome to Mere!': 'مرحبًا بك في مير!',
  "You're all caught up.": 'كل شيء محدث.',
  "You're all set!": 'أنت جاهز!',
  "Let's start organizing your medical records.": 'لنبدأ بتنظيم سجلاتك الطبية.',
  "Let's connect to one of your healthcare providers":
    'لنربط حسابك بأحد مزودي الرعاية الصحية لديك',
  'To get started, you will need to connect Mere to a healthcare provider to download your medical records.':
    'للبدء، ستحتاج إلى ربط مير بمزود رعاية صحية لتنزيل سجلاتك الطبية.',
  "After you complete the tutorial, click on the 'Connections'":
    "بعد إكمال الدليل، اضغط على 'الاتصالات'",
  'button to open the connections tab.': 'لفتح تبويب الاتصالات.',
  "After you complete the tutorial, click on the 'Sources'":
    "بعد إكمال الدليل، اضغط على 'المصادر'",
  'button to open the Sources tab.': 'لفتح تبويب المصادر.',
  'From there, select the patient portal your healthcare provider uses.':
    'من هناك، اختر بوابة المرضى التي يستخدمها مزود الرعاية الصحية لديك.',
  'Enjoy using Mere to manage your health records!':
    'استمتع باستخدام مير لإدارة سجلاتك الصحية!',
  'Mere is still in early beta, so if you have any feedback or suggestions, please send us an email at':
    'لا يزال مير في مرحلة بيتا المبكرة، فإذا كانت لديك أي ملاحظات أو اقتراحات، يرجى إرسال بريد إلكتروني إلينا على',
  'to let us know.': 'لإخبارنا.',
  "We see you're using an Apple device": 'نرى أنك تستخدم جهازًا من Apple',
  'For the best experience, you should': 'لأفضل تجربة، ينبغي لك',
  'install Mere as an app': 'تثبيت مير كتطبيق',
  'on your homescreen.': 'على الشاشة الرئيسية.',
  'on your computer.': 'على جهاز الكمبيوتر.',
  'If you do not install Mere as an app, Safari will clear your data after 7 days.':
    'إذا لم تثبت مير كتطبيق، فسيحذف Safari بياناتك بعد 7 أيام.',
  'In the top right corner of your browser, click the share':
    'في الزاوية العلوية اليمنى من المتصفح، اضغط زر المشاركة',
  'In the bottom middle bar of Safari, click the share':
    'في الشريط السفلي الأوسط في Safari، اضغط زر المشاركة',
  'button.': 'الزر.',
  "In the share menu, you should see the option to 'Add to Dock'.":
    "في قائمة المشاركة، يجب أن ترى خيار 'إضافة إلى Dock'.",
  "In the share menu, you should see the option to 'Add to Home Screen'.":
    "في قائمة المشاركة، يجب أن ترى خيار 'إضافة إلى الشاشة الرئيسية'.",
  "Click the 'Add' button to install Mere on your computer.":
    "اضغط زر 'إضافة' لتثبيت مير على جهاز الكمبيوتر.",
  'For the best experience, you can install Mere as an app on your homescreen.':
    'لأفضل تجربة، يمكنك تثبيت مير كتطبيق على الشاشة الرئيسية.',
  'For the best experience, you can install Mere as an app on your computer.':
    'لأفضل تجربة، يمكنك تثبيت مير كتطبيق على جهاز الكمبيوتر.',
  'In the top right corner inside the URL bar, click the install':
    'في الزاوية العلوية اليمنى داخل شريط العنوان، اضغط زر التثبيت',
  'install icon': 'أيقونة التثبيت',
  'You should see the "Install App?" dialog box.':
    'يجب أن يظهر مربع حوار "تثبيت التطبيق؟".',
  "Click the 'install' button to install Mere on your computer.":
    "اضغط زر 'تثبيت' لتثبيت مير على جهاز الكمبيوتر.",
  "When prompted by Chrome, click the 'Add Mere to your Home screen' dialog to install the app on your phone.":
    "عندما يطلب Chrome ذلك، اضغط مربع حوار 'إضافة مير إلى الشاشة الرئيسية' لتثبيت التطبيق على هاتفك.",
  'If you do not get a prompt by Chrome, you can manually install it by clicking the three dots':
    'إذا لم يظهر لك طلب من Chrome، يمكنك تثبيته يدويًا بالضغط على النقاط الثلاث',
  "in the top right corner of Chrome and selecting 'Install app'.":
    "في الزاوية العلوية اليمنى من Chrome واختيار 'تثبيت التطبيق'.",
  'Unfortunately, Firefox does not support installing PWAs.':
    'للأسف، لا يدعم Firefox تثبيت تطبيقات الويب التقدمية.',
  'You can': 'يمكنك',
  'install an extension': 'تثبيت إضافة',
  'to add support for installing PWAs like Mere.':
    'لإضافة دعم تثبيت تطبيقات الويب التقدمية مثل مير.',
  'Unfortunately, your browser may not support installing Mere as a Progressive Web Application (PWA).':
    'للأسف، قد لا يدعم متصفحك تثبيت مير كتطبيق ويب تقدمي (PWA).',
  'To see how to install PWAs in the most commonly supported browsers, you can':
    'لمعرفة كيفية تثبيت تطبيقات الويب التقدمية في أكثر المتصفحات دعمًا، يمكنك',
  'check out this website': 'زيارة هذا الموقع',
  unread: 'غير مقروءة',
  'You should only enable this if you trust the organization hosting the app, as the proxy will be able to access all your health data.':
    'يجب تفعيل هذا فقط إذا كنت تثق بالجهة التي تستضيف التطبيق، لأن خدمة الوسيط ستتمكن من الوصول إلى جميع بياناتك الصحية.',
  'A name is required.': 'الاسم مطلوب.',
  Absent: 'غائب',
  'Active, planned, complete': 'نشط، مخطط، مكتمل',
  'Aligner case': 'حالة التقويم الشفاف',
  'Aligner current': 'رقم القالب الحالي',
  'Aligner total': 'إجمالي القوالب',
  'Appliance / hardware': 'جهاز / أدوات',
  Appliance: 'الجهاز',
  Arch: 'القوس',
  'Attach a scan, photo, PDF, or lab report to this record in the local database.':
    'أرفق مسحا ضوئيا أو صورة أو ملف PDF أو تقرير مختبر بهذا السجل في قاعدة البيانات المحلية.',
  'Blood pressure': 'ضغط الدم',
  'Braces, aligners, expander, retainer': 'تقويم ثابت، قوالب شفافة، موسع، مثبت',
  'Care plan': 'خطة رعاية',
  'Ceph analysis': 'تحليل قياسات الرأس',
  'Class II div 1, right Class I': 'الفئة الثانية قسم 1، اليمين فئة أولى',
  Cleaning: 'تنظيف',
  'Cleaning / hygiene': 'تنظيف / عناية',
  Coded: 'مرمز',
  Comparator: 'المقارن',
  Condition: 'حالة',
  'Consent / transfer': 'موافقة / تحويل',
  'Contact lens prescription': 'وصفة العدسات اللاصقة',
  'Dental condition': 'حالة أسنان',
  'Dental image / scan': 'صورة / مسح أسنان',
  'Dental procedure': 'إجراء أسنان',
  'Dental record': 'سجل الأسنان',
  'e.g. 10 mg': 'مثال: 10 ملغ',
  'e.g. 14': 'مثال: 14',
  'e.g. 24': 'مثال: 24',
  'e.g. 3': 'مثال: 3',
  'e.g. 4': 'مثال: 4',
  'e.g. 6-month cleaning recall': 'مثال: مراجعة تنظيف بعد 6 أشهر',
  'e.g. 8': 'مثال: 8',
  'e.g. Goldmann, OCT, Snellen': 'مثال: غولدمان، OCT، سنلن',
  'e.g. Hemoglobin A1c': 'مثال: الهيموغلوبين A1c',
  'e.g. Negative': 'مثال: سلبي',
  'e.g. oral': 'مثال: فموي',
  'e.g. twice daily': 'مثال: مرتين يوميا',
  Encounter: 'زيارة',
  'Eye image / device report': 'صورة عين / تقرير جهاز',
  'Eye exam / checkup': 'فحص عين / مراجعة',
  'Eye procedure / test': 'إجراء / اختبار عيني',
  'Eye-care record': 'سجل رعاية العين',
  'File linking is available when the local Dexie database is enabled.':
    'ربط الملفات متاح عند تفعيل قاعدة بيانات Dexie المحلية.',
  'FreeStyle Libre': 'FreeStyle Libre',
  'General medical': 'طبي عام',
  'Glasses prescription': 'وصفة النظارات',
  Immunization: 'تحصين',
  'Import a LibreView JSON or CSV export. Readings will appear as glucose observations in Labs.':
    'استورد ملف LibreView بصيغة JSON أو CSV. ستظهر القراءات كملاحظات جلوكوز في المختبرات.',
  Importing: 'جار الاستيراد',
  'Importing...': 'جار الاستيراد...',
  Interpretation: 'التفسير',
  IOP: 'ضغط العين',
  Kind: 'النوع',
  'Keep adding more records after saving':
    'استمر في إضافة المزيد من السجلات بعد الحفظ',
  Low: 'منخفض',
  'Manual record not found': 'لم يتم العثور على السجل اليدوي',
  'Method or device': 'الطريقة أو الجهاز',
  'Molar / canine class': 'تصنيف الأضراس / الأنياب',
  'N/A': 'غير منطبق',
  'Next visit': 'الزيارة التالية',
  'Not performed': 'لم يتم إجراؤه',
  'OD / right': 'OD / اليمنى',
  'OD add': 'إضافة OD',
  'OD axis': 'محور OD',
  'OD cylinder': 'أسطوانة OD',
  'OD IOP': 'ضغط العين OD',
  'OD sphere': 'كرة OD',
  'OD visual acuity': 'حدة البصر OD',
  'OS / left': 'OS / اليسرى',
  'OS add': 'إضافة OS',
  'OS axis': 'محور OS',
  'OS cylinder': 'أسطوانة OS',
  'OS IOP': 'ضغط العين OS',
  'OS sphere': 'كرة OS',
  'OS visual acuity': 'حدة البصر OS',
  'OU / both': 'OU / كلاهما',
  'Ortho assessment': 'تقييم تقويمي',
  'Ortho treatment plan': 'خطة علاج تقويمية',
  'Overbite (mm)': 'العضة العمودية (مم)',
  'Overjet (mm)': 'البروز الأفقي (مم)',
  PD: 'المسافة بين الحدقتين',
  Pending: 'قيد الانتظار',
  Phase: 'المرحلة',
  'Phase I, Phase II, retention': 'المرحلة الأولى، المرحلة الثانية، التثبيت',
  Procedure: 'إجراء',
  Quantity: 'كمية',
  'Quick templates': 'قوالب سريعة',
  'Range high': 'الحد الأعلى',
  'Range low': 'الحد الأدنى',
  'Range text': 'نص النطاق',
  Recall: 'مراجعة',
  'Recall or follow-up': 'مراجعة أو متابعة',
  Refraction: 'انكسار',
  'Refraction / Rx': 'الانكسار / الوصفة',
  Retention: 'تثبيت',
  'Save & add another': 'حفظ وإضافة آخر',
  'Save record': 'حفظ السجل',
  Saving: 'جار الحفظ',
  'Select a file before saving this document.': 'حدد ملفا قبل حفظ هذا المستند.',
  Sign: 'الإشارة',
  Surfaces: 'الأسطح',
  Test: 'الفحص',
  Text: 'نص',
  Tooth: 'السن',
  'Tooth finding': 'ملاحظة سنية',
  'Treatment plan': 'خطة علاج',
  'Unable to import LibreView file': 'تعذر استيراد ملف LibreView',
  'Update record': 'تحديث السجل',
  'Upper, lower, both': 'علوي، سفلي، كلاهما',
  Value: 'القيمة',
  'Value type': 'نوع القيمة',
  'Vision prescription': 'وصفة بصرية',
  'Visual acuity': 'حدة البصر',
  'Vital sign': 'علامة حيوية',
  '3D preview unavailable': 'المعاينة ثلاثية الأبعاد غير متاحة',
  '3D scan preview': 'معاينة المسح ثلاثي الأبعاد',
  'Add Connections': 'إضافة اتصالات',
  'Add Patient Portal': 'إضافة بوابة مريض',
  'Add dental record': 'إضافة سجل أسنان',
  'Add a new connection': 'إضافة اتصال جديد',
  'Add ortho record': 'إضافة سجل تقويم',
  'Allergies and Intolerances': 'الحساسيات وعدم التحمل',
  'Assessment, active treatment, appliances, aligners, adjustments, ceph measurements, retention, and consent.':
    'التقييم والعلاج النشط والأجهزة والقوالب والتعديلات وقياسات الرأس والتثبيت والموافقة.',
  'Bookmarked Items': 'العناصر المحفوظة',
  'Bookmarked Labs': 'المختبرات المحفوظة',
  'Bookmark some labs to see them here': 'احفظ بعض نتائج المختبر لتظهر هنا',
  'Bookmarking labs will allow you to quickly access them here. You can bookmark labs from the timeline by selecting the icon.':
    'يسمح لك حفظ نتائج المختبر بالوصول إليها بسرعة من هنا. يمكنك حفظها من الخط الزمني بتحديد الأيقونة.',
  'Cleaning history': 'تاريخ التنظيف',
  Cleanings: 'عمليات التنظيف',
  'Concept based on odontogram references':
    'المفهوم مبني على مراجع مخطط الأسنان',
  'Connect to Patient Portal': 'الاتصال ببوابة المريض',
  'Connect to a patient portal to automatically download your most recent data.':
    'اتصل ببوابة مريض لتنزيل أحدث بياناتك تلقائيا.',
  'Create an issue': 'إنشاء بلاغ',
  Dental: 'الأسنان',
  'Dental X-rays, CBCT, intraoral photos, and scans remain connected to the Imaging workspace.':
    'تبقى أشعة الأسنان وCBCT والصور داخل الفم والمسوح مرتبطة بمساحة عمل التصوير.',
  'Dental cleanings and hygiene recalls will appear here when synced or added.':
    'ستظهر عمليات تنظيف الأسنان ومراجعات العناية عند مزامنتها أو إضافتها.',
  'Dental findings, procedures, treatment plans, referrals, and perio records will appear here when synced or added.':
    'ستظهر هنا ملاحظات الأسنان والإجراءات وخطط العلاج والإحالات وسجلات اللثة عند مزامنتها أو إضافتها.',
  'Dental imaging': 'تصوير الأسنان',
  'Dental records projection': 'عرض سجلات الأسنان',
  'Disable developer mode': 'تعطيل وضع المطور',
  'Drag and drop the cards to change the order you see them on your summary dashboard.':
    'اسحب البطاقات وأفلتها لتغيير ترتيب ظهورها في لوحة الملخص.',
  'Edit Layout': 'تعديل التخطيط',
  'Enable developer mode': 'تفعيل وضع المطور',
  'Feature requests or bug reports': 'طلبات الميزات أو بلاغات الأخطاء',
  Findings: 'الملاحظات',
  'Find the source code on': 'اعثر على الشفرة المصدرية على',
  'Get started by connecting to a patient portal': 'ابدأ بالاتصال ببوابة مريض',
  'Hello!': 'مرحبا!',
  'Hide experimental features': 'إخفاء الميزات التجريبية',
  Images: 'الصور',
  'Link your medical records': 'اربط سجلاتك الطبية',
  'Loading dental records...': 'جار تحميل سجلات الأسنان...',
  Lower: 'سفلي',
  'Made with': 'صنع بـ',
  'No dental imaging has been detected yet. The dental workspace will pull from imaging records tagged by oral/dental terms.':
    'لم يتم اكتشاف تصوير أسنان بعد. ستسحب مساحة عمل الأسنان سجلات التصوير الموسومة بمصطلحات فموية أو سنية.',
  'No matching records': 'لا توجد سجلات مطابقة',
  'No records found with query: {query}':
    'لم يتم العثور على سجلات تطابق البحث: {query}',
  'No tooth number detected': 'لم يتم اكتشاف رقم سن',
  'Open imaging': 'فتح التصوير',
  Orthodontics: 'تقويم الأسنان',
  Perio: 'اللثة',
  'Prophy, periodontal maintenance, scaling/root planing, fluoride, and hygiene recall.':
    'التنظيف الوقائي وصيانة اللثة وإزالة الجير/تسوية الجذور والفلورايد ومراجعات العناية.',
  Procedures: 'الإجراءات',
  'Select teeth on the odontogram.': 'حدد الأسنان على مخطط الأسنان.',
  'Send an email': 'إرسال بريد إلكتروني',
  'Showing a static dental scan preview because WebGL is not available in this browser.':
    'يتم عرض معاينة ثابتة لمسح الأسنان لأن WebGL غير متاح في هذا المتصفح.',
  'Show experimental features': 'إظهار الميزات التجريبية',
  Teeth: 'الأسنان',
  'Three.js is wired for STL/PLY/OBJ-style scan rendering. This demo preview uses a generated arch until uploaded scan files are stored.':
    'تم تجهيز Three.js لعرض مسوح STL/PLY/OBJ. تستخدم هذه المعاينة التجريبية قوسا مولدا حتى يتم تخزين ملفات المسح المرفوعة.',
  'Tooth chart': 'مخطط الأسنان',
  Overview: 'نظرة عامة',
  'Imaging & scans': 'التصوير والفحوصات',
  'Exams & metrics': 'الفحوصات والقياسات',
  'Surgery & procedures': 'الجراحة والإجراءات',
  Permanent: 'دائمة',
  Deciduous: 'لبنية',
  Mixed: 'مختلطة',
  'Records for tooth': 'سجلات السن',
  'Selected tooth': 'السن المحدد',
  'Select a tooth to view its records.': 'حدد سنا لعرض سجلاته.',
  'No records for this tooth.': 'لا توجد سجلات لهذا السن.',
  Undated: 'بدون تاريخ',
  'Universal numbering with FDI labels, ready for surface-level findings.':
    'ترقيم عالمي مع تسميات FDI، جاهز لملاحظات أسطح الأسنان.',
  Upper: 'علوي',
  Version: 'الإصدار',
  'Welcome back {name}!': 'مرحبا بعودتك {name}!',
  'Your recent medical updates': 'آخر تحديثاتك الطبية',
  '{count} dental images or scans': '{count} صور أو مسوح أسنان',
  '{count} dental records': '{count} سجل أسنان',
  '{count} visits': '{count} زيارات',
  adjustment: 'تعديل',
  aligner: 'قالب شفاف',
  appliance: 'جهاز',
  cephalometric: 'قياسات الرأس',
  consent: 'موافقة',
  diagnosis: 'تشخيص',
  or: 'أو',
  'treatment plan': 'خطة علاج',
  'Add to this app': 'إضافة إلى هذا التطبيق',
  'Add your information': 'أضف معلوماتك',
  'Are you sure you want to remove your password? This will decrypt your medical records and you will no longer be prompted to provide a password before seeing your medical records.':
    'هل أنت متأكد أنك تريد إزالة كلمة المرور؟ سيؤدي ذلك إلى فك تشفير سجلاتك الطبية ولن يطلب منك إدخال كلمة مرور قبل عرضها.',
  Canada: 'كندا',
  Data: 'البيانات',
  'Enable configured remote terminology lookup':
    'تفعيل البحث البعيد المكون للمصطلحات',
  'Encrypt export': 'تشفير التصدير',
  'Encrypted package (.emrpkg)': 'حزمة مشفرة (.emrpkg)',
  'Export .emrpkg': 'تصدير .emrpkg',
  'Export all of your data in JSON format. You can use this to backup your data and can import it back if needed.':
    'صدر كل بياناتك بتنسيق JSON. يمكنك استخدامه لنسخ بياناتك احتياطيا واستيرادها مرة أخرى عند الحاجة.',
  'Export and import your data as a single': 'صدر واستورد بياناتك كملف واحد',
  'Export data': 'تصدير البيانات',
  'File selected': 'تم اختيار ملف',
  'Global baseline': 'الخط الأساسي العالمي',
  'Hybrid local-first': 'هجين مع أولوية محلية',
  'Import .emrpkg': 'استيراد .emrpkg',
  'Import data': 'استيراد البيانات',
  'Import mode': 'وضع الاستيراد',
  'Import previously exported data': 'استيراد بيانات مصدرة سابقا',
  'Import terminology pack': 'استيراد حزمة مصطلحات',
  'Installed packs': 'الحزم المثبتة',
  'Local only': 'محلي فقط',
  'Lookup mode': 'وضع البحث',
  'No packs installed.': 'لا توجد حزم مثبتة.',
  'Passphrase for encrypted package': 'عبارة المرور للحزمة المشفرة',
  'Persistent storage is enabled.': 'التخزين الدائم مفعل.',
  'Persistent storage is not enabled - data may be cleared by the browser.':
    'التخزين الدائم غير مفعل - قد يمحو المتصفح البيانات.',
  Profile: 'الملف الشخصي',
  'Remove Password': 'إزالة كلمة المرور',
  'Remove password and decrypt data': 'إزالة كلمة المرور وفك تشفير البيانات',
  'Replace everything': 'استبدال كل شيء',
  'Select backup file': 'اختر ملف النسخة الاحتياطية',
  'Server first': 'الخادم أولا',
  'Set Password': 'تعيين كلمة المرور',
  'Set a password to encrypt your medical records with. Note that forgetting your password will prevent you from accessing your data permanently.':
    'عين كلمة مرور لتشفير سجلاتك الطبية. لاحظ أن نسيان كلمة المرور سيمنعك من الوصول إلى بياناتك نهائيا.',
  'Set encryption password': 'تعيين كلمة مرور التشفير',
  'Start Export': 'بدء التصدير',
  'Start Import': 'بدء الاستيراد',
  'Storage usage': 'استخدام التخزين',
  'Terminology pack imported': 'تم استيراد حزمة المصطلحات',
  'Unable to import terminology pack: {message}':
    'تعذر استيراد حزمة المصطلحات: {message}',
  'United States': 'الولايات المتحدة',
  'Use a passkey instead of a passphrase':
    'استخدم مفتاح مرور بدلا من عبارة مرور',
  Working: 'جار العمل',
  // Timeline comments
  Comments: 'التعليقات',
  'Add a comment…': 'أضف تعليقا…',
  Post: 'نشر',
  'No comments yet': 'لا توجد تعليقات بعد',
  You: 'أنت',
  'Delete comment': 'حذف التعليق',
  '{count} comment': '{count} تعليق',
  '{count} comments': '{count} تعليقات',
  // Citations
  'Evidence:': 'الدليل:',
  'Open citation source': 'فتح مصدر الاقتباس',
  // Results hub and Summary digest
  'Loading results...': 'جار تحميل النتائج...',
  'No results found.': 'لم يتم العثور على نتائج.',
  'Open all results': 'فتح كل النتائج',
  Attention: 'انتباه',
  'Unknown date': 'تاريخ غير معروف',
  '{attention} of {total} results may need attention.':
    'قد تحتاج {attention} من أصل {total} نتيجة إلى الانتباه.',
  '{total} results, none flagged for attention.':
    '{total} نتيجة، لم يتم تمييز أي منها للانتباه.',
  '{attention} of {total} lab, imaging and report results may need attention.':
    'قد تحتاج {attention} من أصل {total} من نتائج المختبر والتصوير والتقارير إلى الانتباه.',
  '{total} lab, imaging and report results, none flagged for attention.':
    '{total} من نتائج المختبر والتصوير والتقارير، لم يتم تمييز أي منها للانتباه.',
  // Sources / connections hub
  Sources: 'المصادر',
  'Bring records together from patient portals, files, devices, and manual entry. Everything is stored locally on this device.':
    'اجمع السجلات من بوابات المرضى والملفات والأجهزة والإدخال اليدوي. يتم تخزين كل شيء محليا على هذا الجهاز.',
  'Connected portals': 'البوابات المتصلة',
  'Patient portals you have connected for automatic syncing.':
    'بوابات المرضى التي قمت بربطها للمزامنة التلقائية.',
  'No portals connected yet.': 'لا توجد بوابات متصلة بعد.',
  'Add a portal': 'إضافة بوابة',
  'Devices and wearables': 'الأجهزة والأجهزة القابلة للارتداء',
  'Continuous glucose monitors and other devices you import readings from.':
    'أجهزة مراقبة الجلوكوز المستمرة وغيرها من الأجهزة التي تستورد قراءاتها.',
  'No devices yet. Import a FreeStyle Libre export or log device readings manually.':
    'لا توجد أجهزة بعد. استورد ملف تصدير FreeStyle Libre أو سجل قراءات الجهاز يدويا.',
  'Import records': 'استيراد السجلات',
  'Move records in and out of the app as files — useful when your provider is unsupported.':
    'انقل السجلات من التطبيق وإليه كملفات — مفيد عندما يكون مزود الرعاية لديك غير مدعوم.',
  'Add manually': 'إضافة يدويا',
  'Enter records by hand, including dedicated dental and optometry modes.':
    'أدخل السجلات يدويا، بما في ذلك وضعان مخصصان للأسنان والبصريات.',
  'Add a record': 'إضافة سجل',
  'Dental records': 'سجلات الأسنان',
  'Optometry records': 'سجلات البصريات',
  'Source health / sync history': 'حالة المصادر / سجل المزامنة',
  'Last successful and attempted sync for every source.':
    'آخر مزامنة ناجحة وآخر محاولة مزامنة لكل مصدر.',
  'Last sync': 'آخر مزامنة',
  'Last attempt': 'آخر محاولة',
  'No sources yet.': 'لا توجد مصادر بعد.',
  Error: 'خطأ',
  OK: 'سليم',
  // Immunizations
  'Loading immunization records...': 'جار تحميل سجلات التحصينات...',
  'No immunizations yet': 'لا توجد تحصينات بعد',
  'Immunizations will appear here once they are added manually or synced from a patient portal.':
    'ستظهر التحصينات هنا بمجرد إضافتها يدويا أو مزامنتها من بوابة مريض.',
  // Loading states across tabs
  'Loading medications...': 'جار تحميل الأدوية...',
  'Loading insurance...': 'جار تحميل التأمين...',
  'Loading documents...': 'جار تحميل المستندات...',
  'Loading problems...': 'جار تحميل المشكلات الصحية...',
  'Loading care plan records...': 'جار تحميل سجلات خطط الرعاية...',
  'Loading conditions...': 'جار تحميل الحالات...',
  // OAuth callback pages
  'Authenticated! Redirecting': 'تم التحقق! جار إعادة التوجيه',
  'There was a problem trying to sign in':
    'حدثت مشكلة أثناء محاولة تسجيل الدخول',
  'Go to Settings': 'الانتقال إلى الإعدادات',
  'Go Back': 'رجوع',
  'You can try enabling proxy authentication in the settings section if login continues to fail':
    'يمكنك تجربة تفعيل المصادقة عبر الوسيط من قسم الإعدادات إذا استمر فشل تسجيل الدخول',
  'Epic OAuth configuration is incomplete':
    'إعدادات OAuth لنظام Epic غير مكتملة',
  'Cerner OAuth configuration is incomplete':
    'إعدادات OAuth لنظام Cerner غير مكتملة',
  'VA OAuth configuration is incomplete': 'إعدادات OAuth لنظام VA غير مكتملة',
  'Veradigm OAuth configuration is incomplete':
    'إعدادات OAuth لنظام Veradigm غير مكتملة',
  'Healow OAuth configuration is incomplete':
    'إعدادات OAuth لنظام Healow غير مكتملة',
  'User session not found': 'لم يتم العثور على جلسة المستخدم',
  'Missing required tokens from authentication response':
    'رموز مطلوبة مفقودة من استجابة المصادقة',
  'Authentication failed': 'فشلت المصادقة',
  'Error completing authentication: no session':
    'خطأ في إكمال المصادقة: لا توجد جلسة',
  'Error completing authentication: not logged in':
    'خطأ في إكمال المصادقة: لم يتم تسجيل الدخول',
  'Error completing authentication: no access token provided':
    'خطأ في إكمال المصادقة: لم يتم توفير رمز وصول',
  'Token refresh failed. You may need to sign in again to sync records in the future.':
    'فشل تحديث رمز الوصول. قد تحتاج إلى تسجيل الدخول مرة أخرى لمزامنة السجلات مستقبلا.',
  'This MyChart instance does not support automatic token refresh. You will need to sign in again to sync records in the future.':
    'لا تدعم نسخة MyChart هذه التحديث التلقائي لرمز الوصول. ستحتاج إلى تسجيل الدخول مرة أخرى لمزامنة السجلات مستقبلا.',
  'Dynamic client registration failed. You may need to sign in again to sync records in the future.':
    'فشل تسجيل العميل الديناميكي. قد تحتاج إلى تسجيل الدخول مرة أخرى لمزامنة السجلات مستقبلا.',
  // Settings import notifications
  'Import failed: database is not ready yet.':
    'فشل الاستيراد: قاعدة البيانات ليست جاهزة بعد.',
  'This user profile package is encrypted. Import it from Data settings so you can enter the passphrase.':
    'حزمة الملف الشخصي هذه مشفرة. استوردها من إعدادات البيانات لتتمكن من إدخال عبارة المرور.',
  'Import failed': 'فشل الاستيراد',
  'Imported user profile': 'تم استيراد الملف الشخصي للمستخدم',
  records: 'سجلات',
  Skipped: 'تم تخطي',
  'Reloading...': 'جار إعادة التحميل...',

  // ---------------------------------------------------------------------
  // Global navigation and app shell
  // ---------------------------------------------------------------------
  More: 'المزيد',
  Utilities: 'الأدوات',
  'All records': 'كل السجلات',
  'All results': 'كل النتائج',
  'Health profile': 'الملف الصحي',
  'My conditions': 'حالاتي',
  'My Conditions': 'حالاتي',
  'Care & visits': 'الرعاية والزيارات',
  'Documents & admin': 'المستندات والإدارة',
  Specialty: 'التخصص',
  Providers: 'مزودو الرعاية',
  Problems: 'المشكلات الصحية',
  Visits: 'الزيارات',
  Histories: 'التاريخ الصحي',
  Goals: 'الأهداف',
  Documents: 'المستندات',
  Insurance: 'التأمين',
  Vitals: 'العلامات الحيوية',
  'Care plans': 'خطط الرعاية',
  Referrals: 'الإحالات',
  'not counted': 'غير محتسبة',
  'Not counted': 'غير محتسبة',
  'Welcome to the Mere Medical demo! We have added some test data for you. Some features are disabled while in demo mode.':
    'مرحبا بك في العرض التجريبي لمير ميديكال! أضفنا بعض البيانات التجريبية لك. بعض الميزات معطلة في الوضع التجريبي.',
  Collapse: 'طي',
  Expand: 'توسيع',
  Restore: 'استعادة',
  'Try again': 'حاول مرة أخرى',
  'Close search': 'إغلاق البحث',
  'Scroll tabs left': 'تمرير التبويبات لليسار',
  'Scroll tabs right': 'تمرير التبويبات لليمين',
  'Change record type': 'تغيير نوع السجل',
  'Search records, pages, and actions': 'البحث في السجلات والصفحات والإجراءات',
  'No matching pages or actions': 'لا توجد صفحات أو إجراءات مطابقة',
  'No matching records, pages, or actions':
    'لا توجد سجلات أو صفحات أو إجراءات مطابقة',
  'Your records': 'سجلاتك',
  'Pages and actions': 'الصفحات والإجراءات',
  'Searching…': 'جارٍ البحث…',
  Unknown: 'غير معروف',
  Hidden: 'مخفي',
  None: 'لا شيء',
  Logo: 'الشعار',

  // ---------------------------------------------------------------------
  // Not found page
  // ---------------------------------------------------------------------
  'Page not found': 'الصفحة غير موجودة',
  'There is nothing at this address': 'لا يوجد شيء في هذا العنوان',
  'We could not find a page for': 'لم نتمكن من العثور على صفحة لـ',
  '. The link may be out of date, or the page may have moved. Your records are untouched.':
    '. قد يكون الرابط قديما أو ربما نقلت الصفحة. سجلاتك لم تتغير.',
  'Browse records': 'تصفح السجلات',
  'Go to timeline': 'الانتقال إلى الخط الزمني',

  // ---------------------------------------------------------------------
  // Records hub
  // ---------------------------------------------------------------------
  'Search record categories': 'البحث في فئات السجلات',
  'What is in Records': 'ما الذي تحتويه السجلات',
  'Everything imported from your connected providers: results, your health profile, visits and care, documents, and the dental and optometry workspaces. Pick a category from the list on the left, or search above to jump straight to one.':
    'كل ما استورد من مزودي الرعاية المتصلين: النتائج وملفك الصحي والزيارات والرعاية والمستندات ومساحتا عمل الأسنان والبصريات. اختر فئة من القائمة الجانبية، أو ابحث في الأعلى للانتقال مباشرة إلى إحداها.',
  'Most recent records': 'أحدث السجلات',
  'Combined views such as Labs, Vitals, Imaging and All results are not tallied, so they never appear here — open them from the list on the left.':
    'لا تحتسب العروض المجمعة مثل المختبرات والعلامات الحيوية والتصوير وكل النتائج، لذا لا تظهر هنا أبدا — افتحها من القائمة الجانبية.',
  'No records found for this filter': 'لم يتم العثور على سجلات لهذا الفلتر',
  record: 'سجل',
  conditions: 'حالات',
  documents: 'مستندات',
  items: 'عناصر',
  plans: 'خطط',
  prescriptions: 'وصفات',
  reports: 'تقارير',
  surgeries: 'عمليات جراحية',
  visits: 'زيارات',
  types: 'أنواع',
  doses: 'جرعات',
  dose: 'جرعة',
  'timeline items': 'عناصر الخط الزمني',

  // ---------------------------------------------------------------------
  // Status, provenance and shared field labels
  // ---------------------------------------------------------------------
  Active: 'نشط',
  active: 'نشط',
  Inactive: 'غير نشط',
  'Inactive / cancelled': 'غير نشط / ملغى',
  Resolved: 'منتهية',
  Confirmed: 'مؤكد',
  Diagnosis: 'تشخيص',
  'Unknown status': 'حالة غير معروفة',
  unknown: 'غير معروف',
  final: 'نهائي',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  proposed: 'مقترح',
  routine: 'روتيني',
  Complete: 'مكتمل',
  Current: 'الحالية',
  Planned: 'مخطط',
  Stopped: 'موقوف',
  Supplements: 'المكملات',
  'Needs review': 'بحاجة إلى مراجعة',
  'needs review': 'بحاجة إلى مراجعة',
  'Needs attention': 'بحاجة إلى انتباه',
  'In range': 'ضمن النطاق',
  Overdue: 'متأخر',
  'Up to date': 'محدث',
  Recorded: 'مسجل',
  Onset: 'البداية',
  'Provenance:': 'المصدر:',
  'Source and provenance': 'المصدر والأصل',
  'Source type': 'نوع المصدر',
  'Source range': 'نطاق المصدر',
  'Entry method': 'طريقة الإدخال',
  'Original format': 'التنسيق الأصلي',
  'Content type': 'نوع المحتوى',
  Mapping: 'الربط',
  Retrieved: 'تم الجلب',
  Period: 'الفترة',
  Address: 'العنوان',
  Phone: 'الهاتف',
  Relationship: 'صلة القرابة',
  'Relationship to subscriber': 'صلة القرابة بالمشترك',
  Location: 'الموقع',
  Locations: 'المواقع',
  Provider: 'مزود الرعاية',
  Estimate: 'التقدير',
  Signature: 'التوقيع',
  Target: 'الهدف',
  'Follow-up': 'المتابعة',
  'How it was added': 'طريقة الإضافة',
  'Where it came from': 'مصدر البيانات',
  'Workflow context': 'سياق سير العمل',
  'Last synced': 'آخر مزامنة',
  'Untitled document': 'مستند بلا عنوان',
  'Not available': 'غير متاح',
  'No mapped standard; using source range.':
    'لا يوجد معيار مطابق؛ يتم استخدام نطاق المصدر.',
  'Change since previous': 'التغير عن السابق',
  'Open record': 'فتح السجل',
  'Open source record': 'فتح سجل المصدر',
  'Link original document': 'ربط المستند الأصلي',
  'Link records imported from an offline builder to their stored source documents':
    'اربط السجلات المستوردة من أداة إنشاء غير متصلة بمستندات المصدر المخزنة',
  'Repair source links': 'إصلاح روابط المصادر',

  // ---------------------------------------------------------------------
  // Utilities hub and tools
  // ---------------------------------------------------------------------
  'Tools that work on top of your records — prepare for a visit, check what care is due, and export or share what you hold.':
    'أدوات تعمل فوق سجلاتك — استعد لزيارة، وتحقق مما هو مستحق من رعاية، وصدر أو شارك ما لديك.',
  'All tools': 'كل الأدوات',
  'Change tool': 'تغيير الأداة',
  'Visit prep': 'التحضير للزيارة',
  'Health maintenance': 'المتابعة الصحية',
  'Health Maintenance': 'المتابعة الصحية',
  'Wallet card': 'بطاقة الجيب',
  'Wallet Card': 'بطاقة الجيب',
  'Growth charts': 'مخططات النمو',
  'Growth Charts': 'مخططات النمو',
  Sharing: 'المشاركة',
  'Audit log': 'سجل التدقيق',
  Trackers: 'المتتبعات',
  'Build a printable summary and packet for your next visit.':
    'أنشئ ملخصا وحزمة قابلين للطباعة لزيارتك القادمة.',
  'See which screenings and vaccines are due or overdue.':
    'اطلع على الفحوصات واللقاحات المستحقة أو المتأخرة.',
  'A pocket-sized emergency summary you can print and carry.':
    'ملخص طوارئ بحجم الجيب يمكنك طباعته وحمله.',
  'Plot height, weight and BMI against reference percentiles.':
    'ارسم الطول والوزن ومؤشر كتلة الجسم مقابل النسب المئوية المرجعية.',
  'Log symptoms, vitals, mood, sleep and activity yourself.':
    'سجل الأعراض والعلامات الحيوية والمزاج والنوم والنشاط بنفسك.',
  'Download every record this app holds as a single file.':
    'نزل كل سجل يحتفظ به هذا التطبيق كملف واحد.',
  'Set up emergency access, caregiver proxies and share grants.':
    'أعد الوصول في الطوارئ ووكلاء الرعاية وأذونات المشاركة.',
  'Review what was exported, shared or changed, and when.':
    'راجع ما تم تصديره أو مشاركته أو تغييره ومتى.',
  'No audit events yet': 'لا توجد أحداث تدقيق بعد',
  'Imports, edits, exports, shares, AI access, and sync events will appear here as local audit entries.':
    'ستظهر هنا عمليات الاستيراد والتعديل والتصدير والمشاركة ووصول الذكاء الاصطناعي وأحداث المزامنة كإدخالات تدقيق محلية.',

  // ---------------------------------------------------------------------
  // Trackers
  // ---------------------------------------------------------------------
  'Log symptoms, vitals, mood, sleep, and activity between visits.':
    'سجل الأعراض والعلامات الحيوية والمزاج والنوم والنشاط بين الزيارات.',
  'Add tracker entry': 'إضافة إدخال متتبع',
  'Add entry': 'إضافة إدخال',
  Totals: 'الإجماليات',
  'Recent entries': 'أحدث الإدخالات',
  Symptom: 'عرض',
  Vital: 'علامة حيوية',
  Mood: 'المزاج',
  Sleep: 'النوم',
  Activity: 'النشاط',
  Steps: 'الخطوات',
  'Open trackers': 'فتح المتتبعات',

  // ---------------------------------------------------------------------
  // Health maintenance
  // ---------------------------------------------------------------------
  item: 'عنصر',
  'may need attention based on your records and profile.':
    'قد يحتاج إلى انتباه بناء على سجلاتك وملفك الشخصي.',
  'item needs attention based on the selected schedule.':
    'عنصر بحاجة إلى انتباه حسب الجدول المحدد.',
  'items need attention based on the selected schedule.':
    'عناصر بحاجة إلى انتباه حسب الجدول المحدد.',
  'Log record': 'تسجيل سجل',
  Dismiss: 'تجاهل',
  'Hide dismissed': 'إخفاء المتجاهل',
  'Show dismissed': 'إظهار المتجاهل',
  'Hide for now': 'إخفاء الآن',
  "Don't recommend this": 'لا توص بهذا',
  "Won't recommend": 'لن يوصى به',
  'Dismiss options': 'خيارات التجاهل',
  'Check-up': 'فحص دوري',
  Screening: 'فحص وقائي',
  'Due / recommended': 'مستحق / موصى به',
  'Recommended — no record found': 'موصى به — لم يتم العثور على سجل',
  'No record found': 'لم يتم العثور على سجل',
  'Due now': 'مستحق الآن',
  'No due date': 'لا يوجد تاريخ استحقاق',
  'Next actions': 'الإجراءات التالية',
  'No active recommendations for the selected schedule.':
    'لا توجد توصيات نشطة للجدول المحدد.',
  'Everything looks up to date for the selected schedule.':
    'يبدو كل شيء محدثا بالنسبة للجدول المحدد.',
  'Influenza vaccine': 'لقاح الإنفلونزا',
  'Recommended every flu season for almost everyone 6 months and older.':
    'يوصى به كل موسم إنفلونزا لمعظم الأشخاص من عمر ستة أشهر فما فوق.',
  'COVID-19 vaccine': 'لقاح كوفيد-19',
  'Stay up to date with the recommended COVID-19 vaccine schedule.':
    'حافظ على تحديث جرعاتك حسب جدول لقاح كوفيد-19 الموصى به.',
  'Dental exam & cleaning': 'فحص وتنظيف الأسنان',
  'A routine dental exam and cleaning is generally recommended every 6 months.':
    'يوصى عادة بفحص وتنظيف روتيني للأسنان كل ستة أشهر.',
  'HPV vaccination': 'تطعيم فيروس الورم الحليمي البشري',
  'The HPV vaccine series is routinely recommended starting at age 11–12.':
    'يوصى عادة ببدء سلسلة لقاح HPV في عمر 11 إلى 12 سنة.',
  'Meningococcal vaccine': 'لقاح المكورات السحائية',
  'MenACWY is recommended at age 11–12 with a booster at 16.':
    'يوصى بلقاح MenACWY في عمر 11 إلى 12 سنة مع جرعة معززة في عمر 16.',
  'Lipid (cholesterol) screening': 'فحص الدهون (الكوليسترول)',
  'Lipid screening is recommended once between ages 9–11, then periodically.':
    'يوصى بفحص الدهون مرة واحدة بين عمر 9 و11 سنة، ثم بشكل دوري.',
  'Blood pressure check': 'قياس ضغط الدم',
  'Blood pressure should be measured at least once a year from age 3.':
    'ينبغي قياس ضغط الدم مرة واحدة سنويا على الأقل ابتداء من عمر ثلاث سنوات.',
  'Tdap / tetanus booster': 'الجرعة المعززة Tdap / الكزاز',
  'A Tdap booster is recommended at age 11–12, then a Td/Tdap every 10 years.':
    'يوصى بجرعة Tdap معززة في عمر 11 إلى 12 سنة، ثم Td/Tdap كل عشر سنوات.',
  'Well-child / annual check-up (BMI)':
    'الفحص الدوري السنوي للطفل (مؤشر كتلة الجسم)',
  'An annual check-up tracks growth, BMI and development.':
    'يتابع الفحص السنوي النمو ومؤشر كتلة الجسم والتطور.',
  'Hepatitis B vaccination': 'تطعيم التهاب الكبد B',
  'A complete hepatitis B series is recommended for all ages.':
    'يوصى بسلسلة كاملة من لقاح التهاب الكبد B لجميع الأعمار.',
  "Simplified general-population guidance for demonstration — always follow your clinician's recommendations.":
    'إرشادات مبسطة لعموم الناس لأغراض العرض التجريبي — التزم دائما بتوصيات طبيبك.',

  // ---------------------------------------------------------------------
  // Wallet card
  // ---------------------------------------------------------------------
  'A printable emergency summary. Carry it in your wallet or show it to a provider.':
    'ملخص طوارئ قابل للطباعة. احمله في محفظتك أو اعرضه على مزود الرعاية.',
  'The most urgent entries are listed first. Printing includes every entry, not only the ones shown here.':
    'تدرج أكثر الإدخالات إلحاحا أولا. تشمل الطباعة كل الإدخالات، وليس فقط المعروضة هنا.',
  Print: 'طباعة',
  'Generated by Mere Medical on': 'أنشئ بواسطة مير ميديكال في',
  '. Verify with your care team — this summary may be incomplete.':
    '. تحقق من فريق الرعاية الخاص بك — قد يكون هذا الملخص غير مكتمل.',

  // ---------------------------------------------------------------------
  // Growth charts
  // ---------------------------------------------------------------------
  'plotted against approximate reference percentiles.':
    'مرسومة مقابل نسب مئوية مرجعية تقريبية.',
  '-for-age (': '-حسب العمر (',
  'The shaded band spans the 5th to 95th percentile for':
    'يمتد النطاق المظلل من النسبة المئوية الخامسة إلى الخامسة والتسعين لدى',
  'children and the dashed line is the 50th (median).':
    'الأطفال، والخط المتقطع هو النسبة الخمسون (الوسيط).',
  measurement: 'قياس',
  'plotted.': 'مرسوم.',
  'Age (yrs)': 'العمر (سنوات)',
  BMI: 'مؤشر كتلة الجسم',
  'Reference percentiles are approximate and for visualization only — not a clinical assessment.':
    'النسب المئوية المرجعية تقريبية وللعرض المرئي فقط — وليست تقييما سريريا.',

  // ---------------------------------------------------------------------
  // Sharing and emergency access
  // ---------------------------------------------------------------------
  'Sharing and emergency access': 'المشاركة والوصول في الطوارئ',
  'Your emergency profile, the caregivers who can act for you, and a record of what you have shared — all kept on this device.':
    'ملف الطوارئ الخاص بك، ومقدمو الرعاية الذين يمكنهم التصرف نيابة عنك، وسجل بما شاركته — كل ذلك محفوظ على هذا الجهاز.',
  'Download your records': 'تنزيل سجلاتك',
  'Export scope': 'نطاق التصدير',
  'Full record': 'السجل الكامل',
  'full record': 'السجل الكامل',
  'Everything on this device: every profile, connection, record, and setting.':
    'كل ما على هذا الجهاز: كل ملف شخصي واتصال وسجل وإعداد.',
  'Visit-specific package': 'حزمة خاصة بالزيارة',
  'Just your records and workflow notes, leaving out any other profiles on this device.':
    'سجلاتك وملاحظات سير العمل فقط، دون أي ملفات شخصية أخرى على هذا الجهاز.',
  'Include provenance': 'تضمين مصدر البيانات',
  'Include attachments': 'تضمين المرفقات',
  'Include audit trail': 'تضمين سجل التدقيق',
  'Password-protect package': 'حماية الحزمة بكلمة مرور',
  'Package summary': 'ملخص الحزمة',
  'Scope:': 'النطاق:',
  Includes: 'يشمل',
  'provenance metadata': 'بيانات المصدر الوصفية',
  'embedded attachments': 'مرفقات مضمنة',
  Omits: 'يستثني',
  'audit trail metadata': 'بيانات سجل التدقيق الوصفية',
  'Not password protected': 'غير محمية بكلمة مرور',
  'The share grants below are your own notes. They give nobody access on their own — you share by handing over the package you download here.':
    'أذونات المشاركة أدناه هي ملاحظاتك الخاصة. وهي لا تمنح أحدا صلاحية الوصول بحد ذاتها — أنت تشارك بتسليم الحزمة التي تنزلها من هنا.',
  'Download package': 'تنزيل الحزمة',
  'Emergency profile': 'ملف الطوارئ',
  'Preferred name': 'الاسم المفضل',
  'Date of birth': 'تاريخ الميلاد',
  'Blood type': 'فصيلة الدم',
  'Primary clinician': 'الطبيب الأساسي',
  'Emergency contact': 'جهة الاتصال في الطوارئ',
  'Emergency phone': 'هاتف الطوارئ',
  'Critical notes': 'ملاحظات حرجة',
  'Caregivers and proxies': 'مقدمو الرعاية والوكلاء',
  'Add proxy': 'إضافة وكيل',
  'No caregiver proxies yet.': 'لا يوجد وكلاء رعاية بعد.',
  'Share grants': 'أذونات المشاركة',
  'Keep track of who you shared records with, what you sent, and when it should expire. These notes do not grant anyone account access or create a share link.':
    'تتبع من شاركت معهم سجلاتك وما أرسلته ومتى ينبغي أن ينتهي. هذه الملاحظات لا تمنح أحدا صلاحية الوصول إلى الحساب ولا تنشئ رابط مشاركة.',
  Recipient: 'المستلم',
  Purpose: 'الغرض',
  'Expires on': 'تنتهي في',
  Categories: 'الفئات',
  'Add grant': 'إضافة إذن',
  'No share grants yet.': 'لا توجد أذونات مشاركة بعد.',

  // ---------------------------------------------------------------------
  // Visit prep
  // ---------------------------------------------------------------------
  'Visit prep and provider packet': 'التحضير للزيارة وحزمة مزود الرعاية',
  'A printable summary and a visit-sized copy of your records, built from what is stored on this device.':
    'ملخص قابل للطباعة ونسخة بحجم الزيارة من سجلاتك، مبنية مما هو مخزن على هذا الجهاز.',
  'Print / PDF': 'طباعة / PDF',
  'Packet contents': 'محتويات الحزمة',
  'Abnormal labs': 'نتائج مختبر غير طبيعية',
  'Visit questions': 'أسئلة الزيارة',
  'Visit record package': 'حزمة سجلات الزيارة',
  'Export your records as a visit-sized .emrpkg file to hand to a provider or keep as a backup.':
    'صدر سجلاتك كملف .emrpkg بحجم الزيارة لتسليمه إلى مزود الرعاية أو للاحتفاظ به كنسخة احتياطية.',
  'Include embedded PDFs and attachments': 'تضمين ملفات PDF والمرفقات',
  'Download .emrpkg': 'تنزيل .emrpkg',
  'Preview before you share': 'المعاينة قبل المشاركة',
  'See exactly what your packet looks like, or open a PDF, image, or text file from this device to check it first.':
    'اطلع على شكل حزمتك بالضبط، أو افتح ملف PDF أو صورة أو ملفا نصيا من هذا الجهاز للتحقق منه أولا.',
  'Packet preview': 'معاينة الحزمة',
  'File preview': 'معاينة الملف',
  'Provider packet': 'حزمة مزود الرعاية',
  'Active problems': 'المشكلات النشطة',
  'Current medications': 'الأدوية الحالية',
  'Recent documents': 'أحدث المستندات',
  'Recent imaging': 'أحدث التصوير',
  'Recent procedures': 'أحدث الإجراءات',
  'Questions for visit': 'أسئلة للزيارة',
  'Saved on this device.': 'محفوظة على هذا الجهاز.',
  'Not saved yet': 'لم تحفظ بعد',
  'Save questions': 'حفظ الأسئلة',

  // ---------------------------------------------------------------------
  // Record export
  // ---------------------------------------------------------------------
  'Export records': 'تصدير السجلات',
  'Download your complete record': 'تنزيل سجلك الكامل',
  'Insurance coverage': 'التغطية التأمينية',
  'Referrals and orders': 'الإحالات والطلبات',
  'Imaging studies': 'دراسات التصوير',
  'Vision prescriptions': 'الوصفات البصرية',
  'Patient profile': 'ملف المريض',
  'Every record stored on this device, counted once, so the chips add up to the total above. Screens that show one slice of your library report smaller figures — Results, for example, counts lab, imaging and report results and leaves out vitals and other observations.':
    'كل سجل مخزن على هذا الجهاز، محسوب مرة واحدة، بحيث تتطابق الشرائح مع الإجمالي أعلاه. الشاشات التي تعرض جزءا واحدا من مكتبتك تظهر أرقاما أصغر — فصفحة النتائج مثلا تحسب نتائج المختبر والتصوير والتقارير وتستثني العلامات الحيوية والملاحظات الأخرى.',
  'Health summary': 'الملخص الصحي',
  'Printable HTML document': 'مستند HTML قابل للطباعة',
  'FHIR Bundle': 'حزمة FHIR',
  'Standards-based JSON (R4)': 'JSON قائم على المعايير (R4)',
  'What each file contains': 'ما يحتويه كل ملف',
  'A printable page you can hand to a new clinic or a family member. One section per area, newest first:':
    'صفحة قابلة للطباعة يمكنك تسليمها إلى عيادة جديدة أو أحد أفراد العائلة. قسم واحد لكل مجال، الأحدث أولا:',
  'Results & vitals': 'النتائج والعلامات الحيوية',
  'Machine-readable, for importing into another health app or keeping as a backup.':
    'قابل للقراءة آليا، للاستيراد إلى تطبيق صحي آخر أو للاحتفاظ به كنسخة احتياطية.',
  'Exports are generated locally on your device — nothing is uploaded. The FHIR Bundle can be imported into other health apps; the health summary is a portable, human-readable copy.':
    'تنشأ الملفات المصدرة محليا على جهازك — لا يرفع أي شيء. يمكن استيراد حزمة FHIR إلى تطبيقات صحية أخرى؛ والملخص الصحي نسخة محمولة يمكن للإنسان قراءتها.',

  // ---------------------------------------------------------------------
  // Sources and connections
  // ---------------------------------------------------------------------
  'Connected · synced': 'متصل · تمت المزامنة',
  'Browser and portal setup': 'إعداد المتصفح والبوابة',
  'You can add records from files and manual entry right now. Connecting a patient portal needs a setup step on the server.':
    'يمكنك إضافة سجلات من الملفات والإدخال اليدوي الآن. أما ربط بوابة مريض فيتطلب خطوة إعداد على الخادم.',
  'On import:': 'عند الاستيراد:',
  'Restore a full record package exported from Mere. Supports passphrase or passkey encryption.':
    'استعد حزمة سجلات كاملة مصدرة من مير. يدعم التشفير بعبارة مرور أو بمفتاح مرور.',
  'Choose .emrpkg file': 'اختر ملف .emrpkg',
  'Export encrypted backup': 'تصدير نسخة احتياطية مشفرة',
  'Download all of your records as a single .emrpkg file. Enter a passphrase above to encrypt it.':
    'نزل كل سجلاتك كملف .emrpkg واحد. أدخل عبارة مرور في الأعلى لتشفيره.',
  'Export backup': 'تصدير النسخة الاحتياطية',
  'Import old JSON backup': 'استيراد نسخة JSON احتياطية قديمة',
  'Import a legacy JSON export from an earlier version of the app.':
    'استورد ملف JSON مصدرا من إصدار سابق من التطبيق.',
  'Choose JSON file': 'اختر ملف JSON',
  'Import device file': 'استيراد ملف جهاز',
  'Import a FreeStyle Libre export or other device file as readings. Choose “Device” on the next screen.':
    'استورد ملف تصدير FreeStyle Libre أو ملف جهاز آخر كقراءات. اختر "الجهاز" في الشاشة التالية.',
  'Add record manually': 'إضافة سجل يدويا',
  'Log conditions, medications, labs, vitals and more by hand — including dental and optometry.':
    'سجل الحالات والأدوية والمختبرات والعلامات الحيوية وغيرها يدويا — بما في ذلك الأسنان والبصريات.',

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  'Edit profile': 'تعديل الملف الشخصي',
  'Privacy mode': 'وضع الخصوصية',
  'How your data moves, at a glance. Adjust the underlying options below.':
    'نظرة سريعة على كيفية انتقال بياناتك. عدل الخيارات الأساسية أدناه.',
  Off: 'معطل',
  Enable: 'تفعيل',
  'Manual entry, file import, and .emrpkg backups. No portal proxy and no data leaves your device.':
    'الإدخال اليدوي واستيراد الملفات ونسخ .emrpkg الاحتياطية. لا وسيط للبوابات ولا تغادر أي بيانات جهازك.',
  'Direct portal sync': 'المزامنة المباشرة مع البوابة',
  'Sync with health systems whose servers let this browser talk to them directly via SMART/FHIR.':
    'المزامنة مع الأنظمة الصحية التي تسمح خوادمها لهذا المتصفح بالتواصل معها مباشرة عبر SMART/FHIR.',
  'Proxy-assisted sync': 'المزامنة عبر وسيط',
  'Needed for portals that cannot talk to the browser directly. A separate proxy service handles login and sync.':
    'مطلوبة للبوابات التي لا تستطيع التواصل مع المتصفح مباشرة. تتولى خدمة وسيطة منفصلة تسجيل الدخول والمزامنة.',
  'The proxy can access all of your health data. Only enable this if you trust the organization hosting the app.':
    'يستطيع الوسيط الوصول إلى جميع بياناتك الصحية. لا تفعله إلا إذا كنت تثق بالجهة التي تستضيف التطبيق.',
  'Turn off proxy': 'إيقاف الوسيط',
  'Cloud AI enabled': 'الذكاء الاصطناعي السحابي مفعل',
  'Opt-in only. Uses OpenAI for AI features. Medical information may be sent to OpenAI servers and API keys are stored in plaintext.':
    'اختياري فقط. يستخدم OpenAI لميزات الذكاء الاصطناعي. قد ترسل معلومات طبية إلى خوادم OpenAI وتخزن مفاتيح الواجهة البرمجية كنص عادي.',
  'AI settings': 'إعدادات الذكاء الاصطناعي',
  'Canada starter terminology': 'مصطلحات كندا الأولية',
  'Mere starter pack': 'حزمة مير الأولية',
  'Starter/demo subset. Use official licensed/imported packs for production terminology coverage.':
    'مجموعة أولية أو تجريبية. استخدم حزما رسمية مرخصة أو مستوردة لتغطية المصطلحات في الاستخدام الفعلي.',
  'Medication safety plugins': 'إضافات سلامة الأدوية',
  'Enable DDInter interaction checks': 'تفعيل فحوصات تفاعلات DDInter',
  'Uses the bundled DDInter CSV files for drug-drug interaction review and stores an imported copy in the browser database. Bundled size is ~13.1 MB. Results are informational and absence from DDInter is not a safety guarantee.':
    'يستخدم ملفات DDInter المضمنة بصيغة CSV لمراجعة التفاعلات الدوائية ويخزن نسخة مستوردة في قاعدة بيانات المتصفح. حجم الحزمة نحو 13.1 ميغابايت. النتائج للاطلاع فقط، وغياب دواء من DDInter ليس ضمانا للسلامة.',
  'Load bundled DDInter data': 'تحميل بيانات DDInter المضمنة',
  'Import DDInter CSV bundle': 'استيراد حزمة DDInter بصيغة CSV',
  'Remove DDInter bundle': 'إزالة حزمة DDInter',
  'Check plugin status': 'التحقق من حالة الإضافة',
  'Clear RxNorm cache': 'مسح ذاكرة RxNorm المؤقتة',
  'Refresh stale RxNorm cache': 'تحديث ذاكرة RxNorm المؤقتة القديمة',
  'DDInter bundle status': 'حالة حزمة DDInter',
  'Missing: load the bundled DDInter data before checking interactions.':
    'مفقودة: حمل بيانات DDInter المضمنة قبل فحص التفاعلات.',
  'Source:': 'المصدر:',
  'License:': 'الترخيص:',
  'DDInter source terms apply': 'تطبق شروط مصدر DDInter',
  'RxNorm cache status': 'حالة ذاكرة RxNorm المؤقتة',
  'RxNorm lookups use RxNav when online and fall back to cached or local medication terms when unavailable.':
    'تستخدم عمليات البحث في RxNorm خدمة RxNav عند الاتصال بالإنترنت، وتعود إلى المصطلحات الدوائية المخزنة أو المحلية عند تعذر ذلك.',
  'file. Optionally protect the file with a passphrase (AES-GCM, PBKDF2-SHA256, 600,000 iterations) or a passkey (WebAuthn PRF). Use this to move your records between browsers or devices.':
    'ملف. يمكنك اختياريا حماية الملف بعبارة مرور (AES-GCM، PBKDF2-SHA256، 600000 تكرار) أو بمفتاح مرور (WebAuthn PRF). استخدم هذا لنقل سجلاتك بين المتصفحات أو الأجهزة.',
  'Storage quota not available.': 'حصة التخزين غير متاحة.',
  'About Mere': 'حول مير',

  // ---------------------------------------------------------------------
  // Manual entry / add record picker
  // ---------------------------------------------------------------------
  'What kind of record do you want to add?': 'ما نوع السجل الذي تريد إضافته؟',
  'Results & measurements': 'النتائج والقياسات',
  'Panels with one or more tests, units and reference ranges':
    'لوحات تضم فحصا واحدا أو أكثر ووحدات ونطاقات مرجعية',
  'Blood pressure, heart rate, weight, temperature, SpO₂':
    'ضغط الدم ومعدل ضربات القلب والوزن ودرجة الحرارة وتشبع الأكسجين',
  'Medications & clinical history': 'الأدوية والتاريخ السريري',
  'Dose, frequency and route for a medication you take':
    'الجرعة والتكرار وطريقة الإعطاء لدواء تتناوله',
  'Condition / diagnosis': 'حالة / تشخيص',
  'An ongoing or past health condition': 'حالة صحية مستمرة أو سابقة',
  'An allergy or intolerance and its reaction': 'حساسية أو عدم تحمل وتفاعلها',
  'Family history': 'التاريخ العائلي',
  'A relative’s condition and how they’re related to you':
    'حالة أحد الأقارب وصلة قرابته بك',
  'Social history': 'التاريخ الاجتماعي',
  'Smoking, alcohol, substances, occupation and lifestyle':
    'التدخين والكحول والمواد والمهنة ونمط الحياة',
  'A vaccine or immunization you received': 'لقاح أو تحصين حصلت عليه',
  'A procedure, test or operation that was performed':
    'إجراء أو فحص أو عملية تم إجراؤها',
  'Encounter / visit': 'زيارة / مراجعة',
  'A clinic visit, appointment or hospital stay':
    'زيارة عيادة أو موعد أو إقامة في المستشفى',
  Referral: 'إحالة',
  'A referral to a specialist, clinic or service':
    'إحالة إلى أخصائي أو عيادة أو خدمة',
  'A plan of care, goals or follow-up instructions':
    'خطة رعاية أو أهداف أو تعليمات متابعة',
  'A target you are working towards, and when you started':
    'هدف تعمل على تحقيقه، وتاريخ البدء',
  'A glasses or contact lens prescription, eye by eye':
    'وصفة نظارات أو عدسات لاصقة، لكل عين',
  'Insurance / coverage': 'تأمين / تغطية',
  'Payer, member ID, plan type and coverage period':
    'الجهة الدافعة ورقم العضوية ونوع الخطة وفترة التغطية',
  'Tooth findings, procedures, cleanings and orthodontics':
    'ملاحظات الأسنان والإجراءات والتنظيف وتقويم الأسنان',
  'Eye care / optometry': 'رعاية العين / البصريات',
  'Glasses & contact Rx, refraction, acuity, IOP, surgery':
    'وصفات النظارات والعدسات اللاصقة والانكسار وحدة البصر وضغط العين والجراحة',
  'Files & devices': 'الملفات والأجهزة',
  'Attach a scan, photo, PDF or imaging report':
    'أرفق مسحا أو صورة أو ملف PDF أو تقرير تصوير',
  'Device import': 'استيراد من جهاز',
  'Import readings from a home device or FreeStyle Libre':
    'استورد القراءات من جهاز منزلي أو من FreeStyle Libre',
  'Jump straight to the right form — fields are pre-selected.':
    'انتقل مباشرة إلى النموذج المناسب — الحقول محددة مسبقا.',
  'Device reading templates': 'قوالب قراءات الأجهزة',
  'Choose a common home-device reading. The form will switch to the matching vital or lab entry.':
    'اختر قراءة شائعة من جهاز منزلي. سينتقل النموذج إلى إدخال العلامة الحيوية أو فحص المختبر المطابق.',

  // ---------------------------------------------------------------------
  // Labs
  // ---------------------------------------------------------------------
  'Add lab result': 'إضافة نتيجة مختبر',
  'Lab coverage': 'تغطية المختبرات',
  Lab: 'مختبر',
  'lab tests in your records are listed below. The filter and the search box decide which ones.':
    'فحوصات المختبر في سجلاتك مدرجة أدناه. الفلتر ومربع البحث يحددان أيها يظهر.',
  'Listing only lab tests with at least one high, low, or borderline result against the selected reference standard.':
    'يتم عرض فحوصات المختبر التي لها نتيجة مرتفعة أو منخفضة أو حدية واحدة على الأقل مقابل المعيار المرجعي المحدد.',
  'Key markers': 'المؤشرات الرئيسية',
  'Lab results': 'نتائج المختبر',
  'Collection dates': 'تواريخ الجمع',
  'Ranges matched to': 'النطاقات مطابقة لـ',
  'Other record types in your records': 'أنواع السجلات الأخرى في سجلاتك',
  'Total records': 'إجمالي السجلات',

  // ---------------------------------------------------------------------
  // Results hub
  // ---------------------------------------------------------------------
  'Labs, imaging, reports, and linked result documents.':
    'المختبرات والتصوير والتقارير ومستندات النتائج المرتبطة.',
  'Total results': 'إجمالي النتائج',
  'Imaging & reports': 'التصوير والتقارير',
  'Imaging / radiology': 'التصوير / الأشعة',
  'Report metadata only': 'بيانات التقرير الوصفية فقط',
  'Diagnostic report': 'تقرير تشخيصي',
  'Lab result': 'نتيجة مختبر',
  Document: 'مستند',
  Collected: 'تاريخ الجمع',
  Updated: 'تاريخ التحديث',
  Performer: 'المنفذ',
  Accession: 'رقم الإدخال',
  'Accession ID': 'رقم الإدخال',
  'Report ID': 'معرف التقرير',
  'Study ID': 'معرف الدراسة',
  Impression: 'الانطباع',
  Narrative: 'السرد',
  'Result note': 'ملاحظة النتيجة',
  'Provider comments': 'تعليقات مزود الرعاية',
  'Linked documents and reports': 'المستندات والتقارير المرتبطة',
  'None linked.': 'لا يوجد شيء مرتبط.',
  'Select a result to view details.': 'حدد نتيجة لعرض التفاصيل.',

  // ---------------------------------------------------------------------
  // Imaging
  // ---------------------------------------------------------------------
  CT: 'التصوير المقطعي',
  MRI: 'الرنين المغناطيسي',
  Ultrasound: 'الموجات فوق الصوتية',
  Files: 'الملفات',
  'Eye care': 'رعاية العين',
  Uncategorized: 'غير مصنفة',
  'X-ray': 'أشعة سينية',
  Report: 'تقرير',
  'Imaging study': 'دراسة تصوير',
  'Add image or scan': 'إضافة صورة أو مسح',
  'A study can appear in more than one group, so these counts do not add up to all imaging.':
    'يمكن أن تظهر الدراسة الواحدة في أكثر من مجموعة، لذا لا يساوي مجموع هذه الأعداد كل سجلات التصوير.',
  'Imaging metadata': 'بيانات التصوير الوصفية',
  Modality: 'نوع التصوير',
  'Body site': 'موضع الجسم',
  Laterality: 'الجانب',
  'Study / report type': 'نوع الدراسة / التقرير',
  'Radiology report, DICOM study, photo': 'تقرير أشعة، دراسة DICOM، صورة',
  'Optional details used to classify and find scans, photos, imaging reports, and DICOM studies.':
    'تفاصيل اختيارية تستخدم لتصنيف الفحوصات والصور وتقارير التصوير ودراسات DICOM والعثور عليها.',
  'Chest, mandible, retina, left knee':
    'الصدر، الفك السفلي، الشبكية، الركبة اليسرى',
  'Left, right, bilateral, OD, OS, OU': 'يسار، يمين، ثنائي، OD، OS، OU',
  'X-ray, CT, MRI, OCT, CBCT': 'أشعة سينية، CT، MRI، OCT، CBCT',
  'Scan file': 'ملف المسح',

  // ---------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------
  'Search documents': 'البحث في المستندات',
  'Search documents, source files, reports':
    'البحث في المستندات وملفات المصدر والتقارير',
  'Upload document': 'رفع مستند',
  'No matching documents': 'لا توجد مستندات مطابقة',
  'Consents and forms': 'الموافقات والنماذج',
  'Forms, signed documents, and authorization paperwork.':
    'النماذج والمستندات الموقعة وأوراق التفويض.',
  'Reports and visit records': 'التقارير وسجلات الزيارات',
  'Documents linked to reports, visits, or result summaries.':
    'مستندات مرتبطة بالتقارير أو الزيارات أو ملخصات النتائج.',
  'Other documents': 'مستندات أخرى',
  'General uploaded or imported files.': 'ملفات عامة مرفوعة أو مستوردة.',
  'Imported PDFs, images, and clinical documents will appear here when they are synced or added.':
    'ستظهر هنا ملفات PDF والصور والمستندات السريرية المستوردة عند مزامنتها أو إضافتها.',

  // ---------------------------------------------------------------------
  // Medications
  // ---------------------------------------------------------------------
  'Reconciled prescriptions, planned therapy, stopped medications, supplements, adherence, and source history.':
    'الوصفات المطابقة والعلاج المخطط والأدوية الموقوفة والمكملات والالتزام وتاريخ المصدر.',
  'Add medication': 'إضافة دواء',
  'Add allergy': 'إضافة حساسية',
  'No medications yet': 'لا توجد أدوية بعد',
  'Add a prescription, over-the-counter medication, or supplement directly. Connected portal records will appear here too.':
    'أضف وصفة طبية أو دواء بدون وصفة أو مكملا مباشرة. ستظهر هنا أيضا سجلات البوابات المتصلة.',
  'Allergy safety review': 'مراجعة سلامة الحساسية',
  'Keep this list reconciled before starting, stopping, or sharing medications. Imported allergies can be stale or duplicated across portals.':
    'حافظ على مطابقة هذه القائمة قبل بدء أي دواء أو إيقافه أو مشاركته. قد تكون الحساسيات المستوردة قديمة أو مكررة بين البوابات.',
  'Supplements and Nutrition': 'المكملات والتغذية',
  'Supplement records are present, but no vitamin, mineral, or nutrition facts were provided.':
    'توجد سجلات مكملات، لكن لم تقدم أي بيانات عن الفيتامينات أو المعادن أو القيم الغذائية.',
  prescription: 'وصفة طبية',
  vitamin: 'فيتامين',
  Oral: 'فموي',
  daily: 'يوميا',
  Adherence: 'الالتزام بالدواء',
  'History and details': 'التاريخ والتفاصيل',
  'Not on File': 'غير مسجل',
  'No Known Allergies': 'لا توجد حساسيات معروفة',

  // ---------------------------------------------------------------------
  // Immunizations
  // ---------------------------------------------------------------------
  'vaccine records with booster tracking': 'سجل لقاح مع تتبع الجرعات المعززة',
  'Add immunization': 'إضافة تحصين',
  'Total doses': 'إجمالي الجرعات',
  'Vaccine types': 'أنواع اللقاحات',
  'Boosters tracked': 'الجرعات المعززة المتتبعة',
  'Booster and schedule recommendations': 'توصيات الجرعات المعززة والجدول',
  'Country schedule': 'الجدول الوطني',
  'Seasonal flu': 'الإنفلونزا الموسمية',
  'COVID-19 booster': 'الجرعة المعززة لكوفيد-19',
  'HPV series': 'سلسلة لقاح HPV',
  'Last dose': 'آخر جرعة',
  'Next due': 'الموعد التالي',
  Doses: 'الجرعات',
  'Dose number': 'رقم الجرعة',
  'Date given': 'تاريخ الإعطاء',
  'Administered by': 'أعطي بواسطة',
  'Lot number': 'رقم التشغيلة',
  Lot: 'التشغيلة',
  'Brand / manufacturer': 'العلامة التجارية / الشركة المصنعة',
  'Recommended:': 'موصى به:',
  'Every year': 'كل سنة',
  'Current seasonal product when eligible':
    'المنتج الموسمي الحالي عند الاستحقاق',
  'Adolescents and eligible adults': 'المراهقون والبالغون المؤهلون',
  Depends: 'حسب الحالة',
  'No matching doses found in the record.':
    'لم يتم العثور على جرعات مطابقة في السجل.',
  'Vaccines by type': 'اللقاحات حسب النوع',
  'Each dose in the order it was given.': 'كل جرعة بترتيب إعطائها.',
  'Immunization timeline': 'الخط الزمني للتحصينات',
  'Every dose, most recent first.': 'كل الجرعات، الأحدث أولا.',
  'Given the same day': 'أعطيت في اليوم نفسه',
  'No other immunizations were recorded on this day.':
    'لم تسجل أي تحصينات أخرى في هذا اليوم.',
  // App-authored vaccine group labels (not record content).
  'COVID-19': 'كوفيد-19',
  'Influenza (flu)': 'الإنفلونزا',
  'Tetanus, diphtheria, pertussis (Tdap/Td)':
    'الكزاز والدفتيريا والسعال الديكي (Tdap/Td)',
  'HPV (human papillomavirus)': 'فيروس الورم الحليمي البشري (HPV)',
  'Shingles (zoster)': 'الحزام الناري (الهربس النطاقي)',
  'Measles, mumps, rubella (MMR)': 'الحصبة والنكاف والحصبة الألمانية (MMR)',
  'Hepatitis A': 'التهاب الكبد A',
  'Hepatitis B': 'التهاب الكبد B',
  Pneumococcal: 'المكورات الرئوية',
  Meningococcal: 'المكورات السحائية',
  'Chickenpox (varicella)': 'الجدري المائي (الحماق)',
  'Other immunizations': 'تحصينات أخرى',

  // ---------------------------------------------------------------------
  // Insurance
  // ---------------------------------------------------------------------
  'Health coverage, payer, member ID, plan period, and source provenance.':
    'التغطية الصحية والجهة الدافعة ورقم العضوية وفترة الخطة ومصدر البيانات.',
  'Add insurance': 'إضافة تأمين',
  'No insurance records': 'لا توجد سجلات تأمين',
  'Coverage records from C-CDA, FHIR, or imported packages will appear here.':
    'ستظهر هنا سجلات التغطية من C-CDA أو FHIR أو الحزم المستوردة.',
  'Member ID': 'رقم العضوية',
  'Group number': 'رقم المجموعة',
  'Subscriber / member number': 'رقم المشترك / العضو',
  'Plan type': 'نوع الخطة',
  'Coverage details': 'تفاصيل التغطية',
  'Coverage start': 'بداية التغطية',
  'Coverage end': 'نهاية التغطية',
  'Extracted coverage text': 'نص التغطية المستخرج',
  'Coverage, claim status, EOB attachments, deductible, annual maximum, and patient responsibility will appear here.':
    'ستظهر هنا التغطية وحالة المطالبة ومرفقات بيان المزايا والمبلغ المقتطع والحد الأقصى السنوي وحصة المريض.',
  Deductible: 'المبلغ المقتطع',
  'Annual max': 'الحد الأقصى السنوي',
  'Patient portion': 'حصة المريض',
  EOB: 'بيان المزايا',
  'Claims and EOBs': 'المطالبات وبيانات المزايا',
  'Payer address': 'عنوان الجهة الدافعة',
  'Payer phone': 'هاتف الجهة الدافعة',
  'Use the Name field above for the payer or insurer.':
    'استخدم حقل الاسم أعلاه للجهة الدافعة أو شركة التأمين.',
  'Search payer, member ID, type, or address':
    'البحث بالجهة الدافعة أو رقم العضوية أو النوع أو العنوان',
  'PPO, HMO, dental, vision, extended health':
    'PPO، HMO، أسنان، بصر، صحة موسعة',
  'Self, spouse, child, dependent': 'نفسي، الزوج أو الزوجة، ابن أو ابنة، معال',

  // ---------------------------------------------------------------------
  // Problems, conditions, allergies, histories
  // ---------------------------------------------------------------------
  'from connected and manually entered records.':
    'من السجلات المتصلة والمدخلة يدويا.',
  'Add problem': 'إضافة مشكلة',
  'Search problems': 'البحث في المشكلات الصحية',
  'Add condition': 'إضافة حالة',
  'Search conditions': 'البحث في الحالات',
  ', each with its related medications, labs, care plans, goals and procedures pulled together.':
    '، ولكل منها ما يرتبط بها من أدوية وفحوصات مختبر وخطط رعاية وأهداف وإجراءات مجمعة معا.',
  related: 'ذات صلة',
  'Diabetes & blood sugar': 'السكري وسكر الدم',
  'Dental & oral health': 'صحة الأسنان والفم',
  'Lungs & breathing': 'الرئتان والتنفس',
  'Mental & behavioral health': 'الصحة النفسية والسلوكية',
  'Bones & injury': 'العظام والإصابات',
  Infection: 'العدوى',
  'Search allergies': 'البحث في الحساسيات',
  'Also recorded': 'مسجل أيضا',
  'Not an allergen': 'ليس مسبب حساسية',
  'These entries state that no allergy was found or that no allergy history was taken. They are not allergens.':
    'تفيد هذه الإدخالات بأنه لم يعثر على حساسية أو لم يؤخذ تاريخ للحساسية. وهي ليست مسببات حساسية.',
  'Mild, moderate, severe': 'خفيف، متوسط، شديد',
  'Add history': 'إضافة تاريخ صحي',
  'Medical history': 'التاريخ الطبي',
  'Surgical & procedure history': 'تاريخ العمليات والإجراءات',
  'Surgical history': 'التاريخ الجراحي',
  'e.g. Father, Mother, Sibling, None':
    'مثال: الأب، الأم، الأخ أو الأخت، لا شيء',

  // ---------------------------------------------------------------------
  // Care plans, goals, referrals, visits, directory
  // ---------------------------------------------------------------------
  'Care plans, goals, orders, and your own checklist tasks and reminders.':
    'خطط الرعاية والأهداف والطلبات ومهامك وتذكيراتك الخاصة.',
  'New care plan': 'خطة رعاية جديدة',
  'Service requests': 'طلبات الخدمة',
  'Add task or reminder': 'إضافة مهمة أو تذكير',
  Task: 'مهمة',
  'Add item': 'إضافة عنصر',
  Checklist: 'قائمة المهام',
  'Add tasks and reminders that only live on this device.':
    'أضف مهام وتذكيرات تبقى على هذا الجهاز فقط.',
  'Add goal': 'إضافة هدف',
  'In Progress': 'قيد التنفيذ',
  Improving: 'في تحسن',
  'Add referral': 'إضافة إحالة',
  'Search referrals': 'البحث في الإحالات',
  'Search procedures': 'البحث في الإجراءات',
  'Search visits': 'البحث في الزيارات',
  'same-day record': 'سجل في اليوم نفسه',
  ambulatory: 'عيادة خارجية',
  'Search vital signs': 'البحث في العلامات الحيوية',
  'Vital signs': 'العلامات الحيوية',
  'Providers & locations': 'مزودو الرعاية والمواقع',
  'Search providers and locations': 'البحث في مزودي الرعاية والمواقع',
  'No providers recorded yet.': 'لا يوجد مزودو رعاية مسجلون بعد.',
  'No locations recorded yet.': 'لا توجد مواقع مسجلة بعد.',

  // ---------------------------------------------------------------------
  // Dental workspace
  // ---------------------------------------------------------------------
  'Chart & teeth': 'المخطط والأسنان',
  Chart: 'المخطط',
  Treatment: 'العلاج',
  'Hygiene & perio': 'العناية واللثة',
  Hygiene: 'العناية',
  'Records & claims': 'السجلات والمطالبات',
  'What to do next': 'ما الخطوة التالية',
  'Open your tooth chart': 'افتح مخطط أسنانك',
  'Review active findings and conditions': 'راجع الملاحظات والحالات النشطة',
  'Confirm planned treatment status': 'أكد حالة العلاج المخطط',
  'Track periodontal measurements and maintenance':
    'تابع قياسات اللثة وأعمال الصيانة',
  'Link imaging to tooth-specific records':
    'اربط التصوير بسجلات الأسنان المحددة',
  Odontogram: 'مخطط الأسنان',
  'Actionable odontogram': 'مخطط أسنان تفاعلي',
  'Tooth-by-tooth status': 'الحالة سنا بسن',
  'Tooth-level status derived from findings, conditions, plans, and completed care.':
    'حالة كل سن مستنتجة من الملاحظات والحالات والخطط والرعاية المكتملة.',
  'Tooth timeline': 'الخط الزمني للسن',
  'Tooth range': 'نطاق الأسنان',
  'Multiple teeth': 'أسنان متعددة',
  Quadrant: 'الربع',
  'UR, UL, LR, LL':
    'الربع العلوي الأيمن، العلوي الأيسر، السفلي الأيمن، السفلي الأيسر',
  'Molar class': 'تصنيف الأضراس',
  'Maxillary, mandibular, both': 'الفك العلوي، الفك السفلي، كلاهما',
  'Permanent, primary, mixed': 'دائمة، لبنية، مختلطة',
  'Patient-facing history of active issues, planned work, and linked tooth-specific records.':
    'تاريخ موجه للمريض يعرض المشكلات النشطة والأعمال المخططة والسجلات المرتبطة بكل سن.',
  'The timeline will populate when records include tooth numbers and status.':
    'سيمتلئ الخط الزمني عندما تتضمن السجلات أرقام الأسنان وحالتها.',
  'Tooth-specific findings will appear here when records include tooth numbers.':
    'ستظهر هنا الملاحظات الخاصة بكل سن عندما تتضمن السجلات أرقام الأسنان.',
  'Perio overview': 'نظرة عامة على اللثة',
  'Perio records': 'سجلات اللثة',
  'Affected teeth': 'الأسنان المتأثرة',
  Maintenance: 'الصيانة',
  bleeding: 'نزيف',
  pocket: 'جيب لثوي',
  probing: 'سبر',
  BOP: 'النزيف عند السبر',
  'Age band': 'الفئة العمرية',
  Pockets: 'الجيوب اللثوية',
  Recession: 'انحسار اللثة',
  Mobility: 'حركة السن',
  Plaque: 'اللويحة',
  Furcation: 'تفرع الجذور',
  'Periodontal measurements, risk signals, and maintenance history will appear here.':
    'ستظهر هنا قياسات اللثة ومؤشرات الخطورة وتاريخ الصيانة.',
  'Recall and scheduling': 'المراجعة والجدولة',
  'Recall record': 'سجل مراجعة',
  'Prophy, child prophy, perio maintenance, hygiene recall, and appointment context will appear here.':
    'سيظهر هنا التنظيف الوقائي للبالغين والأطفال وصيانة اللثة ومراجعات العناية وسياق المواعيد.',
  'Planned dental procedures and referrals will appear here.':
    'ستظهر هنا إجراءات الأسنان المخططة والإحالات.',
  'Imaging mounts': 'مجموعات التصوير',
  'Ungrouped dental imaging': 'تصوير أسنان غير مجمع',
  'Dental image group': 'مجموعة صور أسنان',
  'Dental scans': 'مسوح الأسنان',
  'Detected dental scan sources': 'مصادر مسح الأسنان المكتشفة',
  'Detected scan source files': 'ملفات مصدر المسح المكتشفة',
  'Demo geometry': 'هندسة تجريبية',
  'Add dental image/scan': 'إضافة صورة أو مسح أسنان',
  'Bitewings, panoramic images, CBCT, photos, and scan sets will be grouped here when mount or DICOM metadata is available.':
    'ستجمع هنا صور العضة والصور البانورامية وCBCT والصور ومجموعات المسح عند توفر بيانات المجموعة أو بيانات DICOM الوصفية.',
  'Uploaded STL, PLY, or OBJ files are listed below. The preview is demo geometry until patient scan rendering is implemented.':
    'ملفات STL أو PLY أو OBJ المرفوعة مدرجة أدناه. المعاينة هندسة تجريبية إلى أن يتم تنفيذ عرض مسوح المريض.',
  'No dental scan source file is attached yet. Add a dental image/scan to store the source file with the record.':
    'لم يرفق بعد أي ملف مصدر لمسح الأسنان. أضف صورة أو مسح أسنان لتخزين ملف المصدر مع السجل.',
  'These files are source attachments. The preview above remains demo geometry until patient scan rendering is implemented.':
    'هذه الملفات مرفقات مصدر. تبقى المعاينة أعلاه هندسة تجريبية إلى أن يتم تنفيذ عرض مسوح المريض.',
  'Showing a static placeholder because WebGL is not available in this browser.':
    'يتم عرض عنصر نائب ثابت لأن WebGL غير متاح في هذا المتصفح.',
  'Dental surgery': 'جراحة الأسنان',
  'Consults, extractions, implant surgery, grafting, post-op notes, and referrals.':
    'الاستشارات والخلع وجراحة الزراعة والترقيع وملاحظات ما بعد العملية والإحالات.',
  'Add surgery record': 'إضافة سجل جراحة',
  'Dental claim or benefit record': 'سجل مطالبة أو مزايا أسنان',
  'Procedure code': 'رمز الإجراء',
  'Procedure type': 'نوع الإجراء',
  'CDT, ADA, clinic code': 'CDT، ADA، رمز العيادة',
  'Dentist, hygienist, orthodontist': 'طبيب أسنان، أخصائي عناية، أخصائي تقويم',
  'Clinic, room, chair': 'العيادة، الغرفة، الكرسي',
  'Clinic / source': 'العيادة / المصدر',
  'Planned, active, complete': 'مخطط، نشط، مكتمل',
  '6 weeks, wire change, tray review': 'ستة أسابيع، تغيير السلك، مراجعة القالب',
  Aligner: 'قالب شفاف',
  orthodontic: 'تقويم أسنان',
  referral: 'إحالة',
  perio: 'لثة',
  surgery: 'جراحة',
  Surgery: 'الجراحة',
  note: 'ملاحظة',
  finding: 'ملاحظة سريرية',
  report: 'تقرير',
  procedure: 'إجراء',
  retail: 'بيع بالتجزئة',
  'e.g. 12-15': 'مثال: 12-15',
  'e.g. 3, 14, 19': 'مثال: 3، 14، 19',
  'e.g. 1 day, 1 week, 1 month': 'مثال: يوم واحد، أسبوع واحد، شهر واحد',
  'e.g. restoration review in 2 weeks': 'مثال: مراجعة الحشوة بعد أسبوعين',

  // ---------------------------------------------------------------------
  // Optometry workspace
  // ---------------------------------------------------------------------
  Surgeries: 'العمليات الجراحية',
  'Add an eye-care record': 'إضافة سجل رعاية عينية',
  'Glasses Rx': 'وصفة النظارات',
  'Contacts Rx': 'وصفة العدسات اللاصقة',
  'Eye exam': 'فحص العين',
  'Eye image': 'صورة العين',
  Glasses: 'النظارات',
  'Contact lenses': 'العدسات اللاصقة',
  'Current prescription': 'الوصفة الحالية',
  'Prescription timeline': 'الخط الزمني للوصفات',
  'Your most recent glasses and contact lens prescriptions.':
    'أحدث وصفات النظارات والعدسات اللاصقة لديك.',
  'How your glasses and contact lens prescriptions have changed over time.':
    'كيف تغيرت وصفات النظارات والعدسات اللاصقة لديك مع الوقت.',
  'No glasses prescription on file yet.': 'لا توجد وصفة نظارات مسجلة بعد.',
  'No contact lens prescription on file yet.':
    'لا توجد وصفة عدسات لاصقة مسجلة بعد.',
  'No change from the previous prescription of this type.':
    'لا يوجد تغير عن الوصفة السابقة من هذا النوع.',
  'Add a glasses or contact lens prescription to see your current numbers here.':
    'أضف وصفة نظارات أو عدسات لاصقة لترى أرقامك الحالية هنا.',
  'Glasses and contact lens prescriptions will appear here as a dated timeline once added or synced.':
    'ستظهر وصفات النظارات والعدسات اللاصقة هنا كخط زمني مؤرخ بمجرد إضافتها أو مزامنتها.',
  'Checkup history': 'تاريخ المراجعات',
  'Comprehensive eye exams, annual visits, contact lens reviews, and recall history.':
    'فحوص العين الشاملة والزيارات السنوية ومراجعات العدسات اللاصقة وتاريخ المراجعات.',
  'Eye imaging and device reports': 'تصوير العين وتقارير الأجهزة',
  'OCT, fundus photos, visual fields, topography, biometry, PDFs, and DICOM remain connected to the Imaging workspace.':
    'تبقى صور OCT وصور قاع العين والمجالات البصرية والتضاريس والقياسات الحيوية وملفات PDF وDICOM مرتبطة بمساحة عمل التصوير.',
  'Ocular conditions, procedures, and documents':
    'الحالات والإجراءات والمستندات العينية',
  'Refractive and ocular surgeries — LASIK, SMILE, PRK, cataract/IOL, and more.':
    'جراحات تصحيح الإبصار وجراحات العين — الليزك وSMILE وPRK والساد والعدسات داخل العين وغيرها.',
  'Eye surgeries will appear here once added or synced. Use “Surgery” in the quick-add bar to record one.':
    'ستظهر جراحات العين هنا بمجرد إضافتها أو مزامنتها. استخدم "الجراحة" في شريط الإضافة السريعة لتسجيل واحدة.',
  'Surgery details': 'تفاصيل الجراحة',
  Outcome: 'النتيجة',
  Complications: 'المضاعفات',
  'Surgeon / clinic': 'الجراح / العيادة',
  Laser: 'الليزر',
  'Laser platform': 'جهاز الليزر',
  Flap: 'السديلة',
  'Flap thickness (µm)': 'سماكة السديلة (µm)',
  Ablation: 'الاستئصال',
  'Ablation depth (µm)': 'عمق الاستئصال (µm)',
  'Optical zone': 'المنطقة البصرية',
  'Optical zone (mm)': 'المنطقة البصرية (مم)',
  IOL: 'العدسة داخل العين',
  'IOL power': 'قوة العدسة داخل العين',
  'IOL power (D)': 'قوة العدسة داخل العين (D)',
  'IOL / ICL model': 'طراز العدسة داخل العين / ICL',
  'Target refraction': 'الانكسار المستهدف',
  'OD prism': 'موشور OD',
  'OS prism': 'موشور OS',
  'e.g. UCVA 20/20': 'مثال: UCVA 20/20',
  'e.g. plano / emmetropia': 'مثال: صفري / بصر سوي',
  'e.g. Alcon AcrySof IQ': 'مثال: Alcon AcrySof IQ',
  'e.g. VisuMax, WaveLight': 'مثال: VisuMax، WaveLight',
  'e.g. Dr. Priya Shah, OD': 'مثال: د. بريا شاه، أخصائية بصريات',

  // ---------------------------------------------------------------------
  // Summary dashboard
  // ---------------------------------------------------------------------
  'For you': 'لك',
  'Recent and useful record areas to review next.':
    'مجالات سجلات حديثة ومفيدة لمراجعتها تاليا.',
  'Open timeline': 'فتح الخط الزمني',
  'Check medication details and source context.':
    'راجع تفاصيل الأدوية وسياق المصدر.',
  'Allergies and conditions': 'الحساسيات والحالات',
  'Keep key clinical summary items current.':
    'حافظ على تحديث عناصر الملخص السريري الأساسية.',
  'Review your vaccine history and booster status.':
    'راجع تاريخ لقاحاتك وحالة الجرعات المعززة.',
  'Sparkline - click to open graph': 'مخطط مصغر - اضغط لفتح الرسم البياني',
  'Unpin lab': 'إلغاء تثبيت الفحص',
  'Care Plan': 'خطة الرعاية',
  'Unable to load your summary': 'تعذر تحميل الملخص',

  // ---------------------------------------------------------------------
  // Timeline chrome
  // ---------------------------------------------------------------------
  Cards: 'البطاقات',
  'Clinical timeline': 'الخط الزمني السريري',
  'Jump to': 'الانتقال إلى',
  'Jump To': 'الانتقال إلى',
  'Filter timeline records': 'تصفية سجلات الخط الزمني',
  'View More': 'عرض المزيد',
  'Lab Panels': 'لوحات المختبر',
  Coverage: 'التغطية',
  'Family History': 'التاريخ العائلي',
  Encounters: 'الزيارات',
  'Your Labs': 'فحوصاتك المخبرية',
  'Your Documents': 'مستنداتك',
  'Your Conditions': 'حالاتك',
  'Your Procedures': 'إجراءاتك',
  'Your Medications': 'أدويتك',
  'Your Immunizations': 'تحصيناتك',
  'Your Allergies': 'حساسياتك',
  'Your Goals': 'أهدافك',
  'Your Coverage': 'تغطيتك التأمينية',

  // Timeline card titles are assembled from these three frames plus the
  // category names above, rather than looked up as finished sentences: a day
  // holding three or more kinds of record produces one of a combinatorial set
  // of titles, which no dictionary can enumerate.
  'Your {a}': 'سجلات {a} الخاصة بك',
  'Your {a} & {b}': 'سجلات {a} و{b} الخاصة بك',
  'Your {a}, {b}, and {n} more': 'سجلات {a} و{b} و{n} أخرى الخاصة بك',
  Consents: 'الموافقات',
  Appointments: 'المواعيد',
  Specimens: 'العينات',
  'Care Teams': 'فرق الرعاية',

  // The Timeline's own search box. Its placeholder used to be a bare literal,
  // which the runtime attribute pass could not match to anything.
  'Loading the tooth chart…': 'جارٍ تحميل مخطط الأسنان…',

  // Dental "What to do next", which now lists the open records themselves.
  'Nothing open. Every dental record here is complete.':
    'لا يوجد شيء مفتوح. كل سجلات الأسنان هنا مكتملة.',
  '{count} record still open': 'سجل واحد ما زال مفتوحًا ({count})',
  '{count} records still open': '{count} سجلات ما زالت مفتوحة',
  '{count} more in Records': '{count} أخرى في السجلات',

  // The app's own confirmation dialogs, which replaced the browser's
  // `window.confirm` — untranslatable beyond whatever string it was handed.
  'Delete this record?': 'حذف هذا السجل؟',
  'The record is removed from this device. This cannot be undone.':
    'سيُحذف السجل من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.',
  'The record and the files attached to it are removed from this device. This cannot be undone.':
    'سيُحذف السجل والملفات المرفقة به من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.',
  'What you have typed here is not saved yet.': 'ما كتبته هنا لم يُحفظ بعد.',
  Discard: 'تجاهل',
  'Keep editing': 'متابعة التحرير',
  'Search your medical records': 'ابحث في سجلاتك الطبية',
  '✨ Search your records with AI':
    '✨ ابحث في سجلاتك باستخدام الذكاء الاصطناعي',
  'Search your records (AI search preparing...)':
    'ابحث في سجلاتك (جارٍ تحضير البحث بالذكاء الاصطناعي...)',

  // ---------------------------------------------------------------------
  // Label tables reached through a dynamic t(variable) call rather than a
  // string literal — see the second scanner in translationCoverage.spec.ts.
  // ---------------------------------------------------------------------

  // Command palette page entries
  'Review records by date': 'راجع السجلات حسب التاريخ',
  'Current health snapshot': 'لمحة عن حالتك الصحية الحالية',
  'Diagnoses, grouped or in detail': 'التشخيصات، مجمعة أو بالتفصيل',
  'Results, ranges, and trends': 'النتائج والنطاقات والاتجاهات',
  'Medication records and prescriptions': 'سجلات الأدوية والوصفات',
  'Imaging reports and studies': 'تقارير ودراسات التصوير',
  'Letters, referrals, consents, and attachments':
    'الرسائل والإحالات والموافقات والمرفقات',
  'Plans, goals, and care journeys': 'الخطط والأهداف ومسارات الرعاية',
  'Eye care records': 'سجلات رعاية العين',
  'Connect or import health sources': 'اتصل بمصادر صحية أو استوردها',
  'Enter or upload a record manually': 'أدخل سجلا أو ارفعه يدويا',
  'Prepare for visits and review next steps':
    'استعد للزيارات وراجع الخطوات التالية',
  'Export, emergency profile, and share grants':
    'التصدير وملف الطوارئ وأذونات المشاركة',
  'Review access and provenance activity': 'راجع نشاط الوصول ومصدر البيانات',
  'Preferences, backups, and local security':
    'التفضيلات والنسخ الاحتياطية والأمان المحلي',

  // Tooth surfaces and tooth-status legend
  Mesial: 'إنسي',
  Distal: 'وحشي',
  Buccal: 'شدقي',
  Facial: 'دهليزي',
  Lingual: 'لساني',
  Occlusal: 'إطباقي',
  Incisal: 'قاطع',
  'Toward the midline': 'باتجاه الخط المتوسط',
  'Away from the midline': 'بعيدا عن الخط المتوسط',
  'Toward the cheek': 'باتجاه الخد',
  'Toward the tongue': 'باتجاه اللسان',
  'Facial surface': 'السطح الدهليزي',
  'Chewing surface': 'سطح المضغ',
  'Incisal edge': 'الحافة القاطعة',
  Sound: 'سليم',
  'No known finding on the tooth.': 'لا توجد ملاحظة معروفة على هذا السن.',
  Filled: 'محشو',
  'Existing restoration or filling.': 'ترميم أو حشوة موجودة.',
  Missing: 'مفقود',
  'Tooth is absent or extracted.': 'السن غائب أو مخلوع.',
  Compromised: 'متضرر',
  'Tooth has a condition that needs review or treatment.':
    'يوجد بالسن حالة تحتاج إلى مراجعة أو علاج.',
  Endodontic: 'معالجة لبية',
  'Root canal or endodontic history.': 'تاريخ معالجة لبية أو قناة جذر.',
  'Gum recessed': 'انحسار لثوي',
  'Gingival recession associated with the tooth.':
    'انحسار لثوي مرتبط بهذا السن.',
  Rotated: 'مدور',
  'Tooth rotation noted for orthodontic or clinical tracking.':
    'دوران في السن مسجل للمتابعة التقويمية أو السريرية.',
  Displaced: 'مزاح',
  'Tooth displacement noted for orthodontic or clinical tracking.':
    'إزاحة في السن مسجلة للمتابعة التقويمية أو السريرية.',
  'Record on file': 'سجل موجود',
  'Treatment done': 'تم العلاج',
  'Treatment planned': 'علاج مخطط',
  'Vitals and self-tracked measurements': 'العلامات الحيوية والقياسات الذاتية',
  Upcoming: 'قادم',

  // Eye prescription table headers
  Sphere: 'الكرة',
  Cyl: 'الأسطوانة',
  Axis: 'المحور',

  // Manual-entry quick templates
  'Adjustment visit': 'زيارة تعديل',
  'Blood pressure cuff': 'جهاز قياس ضغط الدم',
  'Cephalometric analysis': 'تحليل قياسات الرأس',
  'Dental cleaning': 'تنظيف أسنان',
  'Dental extraction': 'خلع سن',
  'Dental finding': 'ملاحظة أسنان',
  'Dental image or scan': 'صورة أو مسح أسنان',
  'Dental implant surgery': 'جراحة زراعة أسنان',
  'Dental treatment plan': 'خطة علاج أسنان',
  Extraction: 'خلع',
  'Eye image or device report': 'صورة عين أو تقرير جهاز',
  'Eye procedure': 'إجراء عيني',
  'Eye surgery': 'جراحة عين',
  'Eye surgery / refractive': 'جراحة عين / تصحيح إبصار',
  'Glucose meter': 'جهاز قياس السكر',
  'Health goal': 'هدف صحي',
  'Implant surgery': 'جراحة زراعة',
  'Manual reading': 'قراءة يدوية',
  'Optical order': 'طلب بصريات',
  'Optometry checkup': 'مراجعة بصريات',
  'Oral surgery consult': 'استشارة جراحة فموية',
  'Oral surgery procedure': 'إجراء جراحة فموية',
  'Orthodontic adjustment visit': 'زيارة تعديل تقويم',
  'Orthodontic appliance': 'جهاز تقويم',
  'Orthodontic assessment': 'تقييم تقويمي',
  'Orthodontic consent': 'موافقة تقويمية',
  'Orthodontic retention': 'تثبيت تقويمي',
  'Orthodontic treatment plan': 'خطة علاج تقويمية',
  'Post-op dental surgery note': 'ملاحظة ما بعد جراحة الأسنان',
  'Post-op surgery note': 'ملاحظة ما بعد الجراحة',
  'Pulse oximeter SpO2': 'مقياس التأكسج - تشبع الأكسجين',
  'Pulse oximeter pulse': 'مقياس التأكسج - النبض',
  Scale: 'الميزان',
  Thermometer: 'ميزان الحرارة',

  // Documents tab groups
  'Letters and referrals': 'الرسائل والإحالات',
  'Inbox-style clinical correspondence separated from files.':
    'مراسلات سريرية بأسلوب صندوق الوارد منفصلة عن الملفات.',

  // Immunization recommendation status
  'On record': 'مسجل',
};

export function getInterfaceLanguageDirection(language: InterfaceLanguage) {
  return (
    interfaceLanguages.find((item) => item.code === language)?.dir ?? 'ltr'
  );
}
