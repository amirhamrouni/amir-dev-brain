# Amir Video Factory

هذا المجلد يحوّل طلب فيديو من المحادثة إلى Job ثابت ثم يرندره عبر MoneyPrinterTurbo على GitHub Actions.

## كيف نستخدمه لاحقاً
أمير يكتب في الشات مثلاً:

`فيديو: 3 استعمالات للذكاء الاصطناعي توفر وقتك`

المساعد يجهز السكريبت وكلمات البحث وفق `MASTER_PROMPT_AR.md` ثم يحدّث:

`video-factory/jobs/latest.json`

أي تحديث لهذا الملف يشغّل Workflow تلقائياً:

`.github/workflows/video-factory.yml`

والناتج يكون Artifact باسم:

`amir-video-factory-output`

ويحتوي:
- MP4 النهائي.
- ملف QC بصيغة JSON.

## الإعداد المجاني الافتراضي
- Edge TTS المجاني.
- الصوت: `ar-TN-HediNeural`.
- بديل أنثوي: `ar-TN-ReemNeural`.
- Subtitle timestamps عبر Edge، بلا Whisper/GPU.
- 9:16.
- 3 ثوان تقريباً لكل clip.
- ترتيب المواد مع ترتيب السكريبت.
- Noto Sans Arabic Bold للترجمة.
- الموسيقى معطلة حالياً لتجنب مشاكل حقوق موسيقى المشروع الافتراضية. نضيف لاحقاً مكتبة موسيقى مرخصة/royalty-free خاصة بنا.

## إعداد مرة واحدة فقط
يلزم مفتاح مجاني واحد على الأقل لمصدر stock footage، محفوظ في GitHub Actions Secrets ولا يوضع داخل الكود:

- `PEXELS_API_KEY` (الأولوية الأولى)
- أو `PIXABAY_API_KEY`
- أو `COVERR_API_KEY`

الـrunner يختار أول مصدر متوفر تلقائياً بالترتيب السابق.

## لماذا لا نحتاج LLM API هنا؟
نرسل إلى MoneyPrinterTurbo `script` و`terms` جاهزين. بذلك لا نحتاج OpenRouter/Gemini/OpenAI داخل ماكينة الرندر نفسها، ونقلل التكلفة وفشل الـprompting.

## Quality gates
بعد الرندر يتم فحص:
- وجود Video stream.
- وجود Audio stream.
- Portrait orientation.
- مدة منطقية.
- خروج MP4 فعلي.

إذا فشل QC لا يتم اعتبار الفيديو ناجحاً.
