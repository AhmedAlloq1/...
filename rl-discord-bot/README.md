# 🚗⚽ Rocket League Team Bot

بوت ديسكورد كامل مبني بـ **Node.js + discord.js v14**، مخصص لسيرفر تيم Rocket League.

## 📁 هيكل المشروع

```
rl-discord-bot/
├── index.js                    # نقطة تشغيل البوت
├── deploy-commands.js          # تسجيل الـ Slash Commands
├── package.json
├── .env.example
├── config/
│   └── config.js               # كل الإعدادات القابلة للتعديل
├── utils/
│   ├── permissions.js          # فحص "أعلى Role" + صلاحيات البوت
│   └── tickets.js               # منطق التذاكر المشترك
├── commands/
│   ├── setup.js                 # إنشاء الهيكل (Idempotent)
│   ├── delete-rooms.js          # حذف الرومات (أعلى Role فقط)
│   ├── delete-roles.js          # حذف الرتب (أعلى Role فقط)
│   ├── ticket-panel.js          # إعادة إرسال لوحة التذاكر
│   ├── clip.js
│   ├── match.js
│   ├── training.js
│   └── roster.js
└── events/
    ├── interactionCreate.js     # يوجّه الأوامر + كل أزرار التذاكر
    └── guildMemberAdd.js        # رسالة الترحيب
```

---

## 1️⃣ التثبيت

```bash
cd rl-discord-bot
npm install
```

هذا يثبت `discord.js` و `dotenv`.

## 2️⃣ إعداد `.env`

انسخ الملف:

```bash
cp .env.example .env
```

ثم افتح `.env` واملأ:

```env
TOKEN=توكن_البوت_من_Developer_Portal
CLIENT_ID=Application_ID
GUILD_ID=ID_السيرفر
```

- **TOKEN**: من https://discord.com/developers/applications → اختر تطبيقك → Bot → Reset Token.
- **CLIENT_ID**: من نفس الصفحة → General Information → Application ID.
- **GUILD_ID**: فعّل Developer Mode (User Settings → Advanced) ثم Right-Click على أيقونة السيرفر → Copy Server ID.

## 3️⃣ تسجيل الـ Slash Commands

```bash
node deploy-commands.js
```

هذا يسجّل الأوامر على سيرفرك فقط (`GUILD_ID`) — تظهر **فورًا**.

للتسجيل Global (على كل السيرفرات التي فيها البوت، يستغرق حتى ساعة للظهور):

```bash
node deploy-commands.js --global
```

## 4️⃣ تشغيل البوت

```bash
node index.js
```

أو عبر npm:

```bash
npm start
```

---

## 🔗 إضافة البوت للسيرفر (OAuth2)

من Developer Portal → تطبيقك → OAuth2 → URL Generator:

**Scopes:**
- `bot`
- `applications.commands`

**Bot Permissions المطلوبة:**
- Manage Channels
- Manage Roles
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages

رابط جاهز (استبدل `CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=268698640&scope=bot%20applications.commands
```

⚠️ **مهم جدًا:** بعد إضافة البوت، ارفع دوره (Role) في قائمة الرتب (Server Settings → Roles) إلى **أعلى من** أي رتبة تريد أن يستطيع البوت إدارتها (حذفها عبر `/delete-roles`، أو التحكم بصلاحياتها في التذاكر). ديسكورد لا يسمح لأي بوت بتعديل أو حذف رتبة أعلى منه أو مساوية له.

---

## 🛡️ نظام الحماية "أعلى Role"

الأوامر التالية محصورة بصاحب **أعلى Role فعلي في السيرفر** (مقارنة `position`، وليس مجرد `Administrator`):

- `/setup`
- `/delete-rooms`
- `/delete-roles`

المنطق في `utils/permissions.js`:
- صاحب السيرفر (Owner) يمرّ دائمًا.
- يتم استبعاد رتب البوتات (managed roles) من حساب "الأعلى" حتى لا يُقفَل الأمر بسبب رتبة بوت عالية.
- إن تساوى أكثر من شخص في أعلى Position، يمرّ الجميع (هذا متوقّع في ديسكورد).

## 🗑️ حماية `/delete-roles`

هذا الأمر **معطّل افتراضيًا** لأنه خطير. لتفعيله:

1. افتح `config/config.js`.
2. أضف أسماء الرتب المسموح حذفها داخل `deletableRoleNames`، مثال:
   ```js
   deletableRoleNames: ["Old Rank", "Test Role"],
   ```
3. حتى مع ذلك، البوت **لن يحذف أبدًا**:
   - `@everyone`
   - رتب البوتات/التكاملات (managed)
   - أي رتبة أعلى من أو تساوي رتبة البوت نفسه
   - أي رتبة لا يملك البوت صلاحية تعديلها فعليًا (`role.editable`)

## 🗑️ `/delete-rooms`

يحذف كل الرومات (نصية، صوتية، Categories) التي يملك البوت صلاحية حذفها. يطلب تأكيدًا بزرّين (✅ Confirm / ❌ Cancel) قبل التنفيذ، ومهلة 30 ثانية. **لا يحذف** السيرفر، الرتب، أو الأعضاء.

---

## 🎫 نظام التذاكر

- روم `🎫・tickets` يحتوي على لوحة بزر **Create Ticket**.
- `/setup` يرسل اللوحة تلقائيًا إذا لم تكن موجودة (Idempotent).
- `/ticket-panel` يحذف اللوحة القديمة ويرسل واحدة جديدة يدويًا.
- كل عضو يستطيع فتح تذكرة واحدة فقط في نفس الوقت (يتم التحقق عبر `topic` الروم، فهذا يعمل حتى بعد إعادة تشغيل البوت).
- أزرار داخل التذكرة: **🙋 Claim** (لـ Staff فقط) و **🔒 Close** (يطلب تأكيدًا).
- من يستطيع الإغلاق يُتحكم به عبر `config.ticketCloseStaffOnly` (افتراضيًا `false`: صاحب التذكرة أو Staff).

---

## ⚙️ التعديلات الشائعة (كلها من `config/config.js`)

| أريد تغيير... | المتغيّر |
|---|---|
| روم الترحيب | `welcomeChannel` |
| أسماء/عدد الرومات والـ Categories | `categories` و `channels` و `voiceChannels` |
| روم/Category التذاكر | `ticketChannel` و `ticketCategory` |
| رتب الـ Staff | `staffRoles` |
| من يستطيع إغلاق التذكرة | `ticketCloseStaffOnly` |
| الرتب المسموح حذفها بـ `/delete-roles` | `deletableRoleNames` |
| رتبة `/roster` | `rosterRole` |
| ألوان الـ Embeds | `colors` |

بعد أي تعديل في `config.js`، **أعد تشغيل البوت** (`node index.js`) فقط — لا حاجة لإعادة `deploy-commands.js` إلا إذا غيّرت أسماء/خيارات الأوامر نفسها.

---

## 🧪 خطوات اختبار كل أمر

1. **`/setup`** — شغّله كصاحب السيرفر أو صاحب أعلى Role. تحقق أن الرومات أُنشئت، ثم شغّله مرة ثانية وتأكد أنه لم يُنشئ نسخًا مكررة.
2. **`/delete-rooms`** — تأكد أن عضوًا عاديًا يُرفض (رسالة ❌)، ثم جرّبه كصاحب أعلى Role واضغط Cancel أولًا للتأكد، وبعدها Confirm.
3. **`/delete-roles`** — أضف رتبة تجريبية في `deletableRoleNames`، تأكد أنها تظهر في قائمة التأكيد فقط، وجرّب الحذف.
4. **`/ticket-panel`** — شغّله في روم التذاكر، تأكد أن اللوحة القديمة حُذفت وظهرت لوحة جديدة.
5. **إنشاء تذكرة** — اضغط "Create Ticket"، تأكد من صلاحيات الروم (أنت + Staff فقط)، وحاول فتح تذكرة ثانية للتأكد من رسالة الرفض.
6. **Claim/Close** — جرّب Claim بحساب Staff وبحساب عادي (يُرفض)، وجرّب Close مع التأكيد والإلغاء.
7. **`/clip`, `/match`, `/training`, `/roster`** — تحقق من شكل الـ Embed والحقول.
8. **الترحيب** — أدخل بحساب تجريبي (أو اطلب من صديق) وتحقق من ظهور رسالة الترحيب في `welcome`.

---

## ❗ أخطاء محتملة وحلولها

| الخطأ | السبب | الحل |
|---|---|---|
| `Used disallowed intents` | لم تفعّل Privileged Intents | في Developer Portal → Bot → فعّل `SERVER MEMBERS INTENT` و `MESSAGE CONTENT INTENT` |
| البوت لا يستجيب لأي أمر | لم تسجّل الأوامر | شغّل `node deploy-commands.js` |
| `Missing Permissions` عند `/setup` أو `/delete-rooms` | رتبة البوت لا تملك Manage Channels، أو رتبته منخفضة جدًا | ارفع رتبة البوت في Server Settings → Roles، وتأكد من منحه الصلاحية عند الدعوة |
| `/delete-roles` لا يحذف شيئًا | لم تضف اسم الرتبة في `deletableRoleNames`، أو الرتبة أعلى من رتبة البوت | عدّل `config.js` وارفع رتبة البوت فوق الرتبة المستهدفة |
| ❌ "ليس لديك صلاحية" رغم أنك Administrator | الأمر يتحقق من "أعلى Role" فعليًا وليس Administrator | تأكد أنك تملك أعلى رتبة في قائمة الرولات (Position)، أو كن صاحب السيرفر |
| رسالة الترحيب لا تظهر | اسم الروم في `welcomeChannel` لا يطابق الروم الفعلي، أو البوت بدون صلاحية Send Messages/Embed Links هناك | تأكد من الاسم حرفيًا (بما فيه الإيموجي)، وامنح الصلاحيات |
| التذكرة لا تُغلق | البوت بدون Manage Channels في تلك الفئة | تأكد من صلاحيات البوت على Category الـ Support |
| `TOKEN` غير صالح | نسخ خاطئ أو تم إعادة توليده | أعد نسخ التوكن من Developer Portal بعد Reset Token |

---

## ☁️ الاستضافة (Hosting)

يعمل هذا المشروع على أي استضافة Node.js: **Railway, Render, VPS (Ubuntu), Pterodactyl**, إلخ.

خطوات عامة:
1. ارفع مجلد المشروع (بدون `node_modules` و `.env` — موجودان في `.gitignore`).
2. أضف متغيرات البيئة (`TOKEN`, `CLIENT_ID`, `GUILD_ID`) من لوحة تحكم المنصة نفسها (Environment Variables)، وليس عبر رفع `.env`.
3. Build Command: `npm install`
4. Start Command: `node index.js`

### التشغيل 24/7

- **Railway / Render**: اختر خطة تدعم Background Worker (وليس Static/Web فقط بدون منفذ مفتوح) — هذا البوت لا يحتاج منفذ HTTP، فاختر نوع "Worker" إن وُجد.
- **VPS**: استخدم `pm2` لإبقاء العملية شغّالة وإعادة تشغيلها تلقائيًا:
  ```bash
  npm install -g pm2
  pm2 start index.js --name rl-bot
  pm2 save
  pm2 startup
  ```
- تجنّب الاستضافات المجانية التي تُنيم (sleep) العملية عند عدم وجود طلبات HTTP، لأن هذا البوت لا يستقبل طلبات HTTP أصلًا.

---

بالتوفيق مع الفريق 🚗🔥
