import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "ko", label: "한국어" },
  { code: "kk", label: "Қазақша" },
  { code: "uz", label: "O'zbekcha" },
];

const PHRASES = {
  ru: {
    "Dashboard": "Панель",
    "Courses": "Курсы",
    "Activities": "Активности",
    "Daily": "День",
    "Friends": "Друзья",
    "Chat": "Чат",
    "Statistics": "Статистика",
    "Settings": "Настройки",
    "Menu": "Меню",
    "Logout": "Выйти",
    "Light": "Светлая",
    "Dark": "Темная",
    "Home": "Главная",
    "Assistant": "Ассистент",
    "Create account": "Создать аккаунт",
    "Start your workspace": "Начните рабочее пространство",
    "Minimal setup — you can change everything later.": "Минимальная настройка — все можно изменить позже.",
    "New here?": "Вы здесь впервые?",
    "Create a study workspace that already feels organized.": "Создайте учебное пространство, которое сразу ощущается организованным.",
    "Setup is intentionally lightweight. You can add course art, notes, schedules, and profile details later.": "Настройка намеренно простая. Обложки курсов, заметки, расписания и профиль можно добавить позже.",
    "Personalized": "Персонально",
    "Practical": "Практично",
    "Ready to grow": "Готово к росту",
    "Name": "Имя",
    "Email": "Почта",
    "Password": "Пароль",
    "Language": "Язык",
    "Choose avatar": "Выбрать аватар",
    "PNG or JPG under 1MB.": "PNG или JPG до 1 МБ.",
    "Already have an account?": "Уже есть аккаунт?",
    "Login": "Войти",
    "Welcome back": "С возвращением",
    "Log in to your workspace": "Войдите в рабочее пространство",
    "Use your existing account to continue.": "Используйте существующий аккаунт.",
    "No account?": "Нет аккаунта?",
    "Register": "Регистрация",
    "Tasks": "Задачи",
    "Create task": "Создать задачу",
    "Your tasks": "Ваши задачи",
    "Create": "Создать",
    "Filters": "Фильтры",
    "Status": "Статус",
    "Course": "Курс",
    "All": "Все",
    "Due date": "Срок",
    "Description": "Описание",
    "Attachments": "Вложения",
    "Choose files": "Выбрать файлы",
    "Estimated minutes": "Минуты",
    "Estimate with AI": "Оценить с ИИ",
    "Priority (1–5)": "Приоритет (1–5)",
    "Splittable": "Можно разделить",
    "Plan task": "Запланировать",
    "Close": "Закрыть",
    "Loading tasks...": "Загрузка задач...",
    "No tasks found.": "Задач нет.",
    "Create activity": "Создать активность",
    "Your activities": "Ваши активности",
    "Refresh": "Обновить",
    "Title": "Название",
    "Description (optional)": "Описание (необязательно)",
    "Duration (minutes)": "Длительность (минуты)",
    "Preferred date": "Желаемая дата",
    "Location (optional)": "Место (необязательно)",
    "Manual start": "Начало вручную",
    "Manual end": "Конец вручную",
    "Choose date": "Выбрать дату",
    "Choose date and time": "Выбрать дату и время",
    "Start time": "Время начала",
    "End time": "Время конца",
    "Save manually": "Сохранить вручную",
    "Plan activity": "Запланировать активность",
    "Open": "Открыть",
    "Delete": "Удалить",
    "Account Settings": "Настройки аккаунта",
    "Save changes": "Сохранить",
    "Saving…": "Сохранение…",
    "Remove avatar": "Удалить аватар",
    "Danger zone": "Опасная зона",
    "Delete account": "Удалить аккаунт",
    "This action is permanent.": "Это действие необратимо.",
    "Create course": "Создать курс",
    "Open all tasks": "Открыть все задачи",
    "Open course": "Открыть курс",
    "Search chats": "Поиск чатов",
    "Write a message. Press Enter to send.": "Напишите сообщение. Enter для отправки.",
    "Send": "Отправить",
    "Clear": "Очистить",
    "Emojis": "Эмодзи",
    "Format": "Формат",
    "Tools": "Инструменты",
    "Add files": "Добавить файлы",
  },
  ko: {
    "Dashboard": "대시보드", "Courses": "강의", "Activities": "활동", "Daily": "하루", "Friends": "친구", "Chat": "채팅", "Statistics": "통계", "Settings": "설정", "Menu": "메뉴", "Logout": "로그아웃", "Light": "라이트", "Dark": "다크", "Home": "홈", "Assistant": "도우미",
    "Create account": "계정 만들기", "Start your workspace": "워크스페이스 시작", "Minimal setup — you can change everything later.": "간단히 시작하고 나중에 모두 바꿀 수 있습니다.", "New here?": "처음이신가요?", "Create a study workspace that already feels organized.": "처음부터 정돈된 학습 공간을 만드세요.", "Setup is intentionally lightweight. You can add course art, notes, schedules, and profile details later.": "설정은 가볍게 만들었습니다. 강의 이미지, 노트, 일정, 프로필은 나중에 추가할 수 있습니다.", "Personalized": "개인화", "Practical": "실용적", "Ready to grow": "확장 준비",
    "Name": "이름", "Email": "이메일", "Password": "비밀번호", "Language": "언어", "Choose avatar": "아바타 선택", "PNG or JPG under 1MB.": "1MB 이하 PNG 또는 JPG.", "Already have an account?": "이미 계정이 있나요?", "Login": "로그인", "Welcome back": "다시 오신 것을 환영합니다", "Log in to your workspace": "워크스페이스에 로그인", "Use your existing account to continue.": "기존 계정으로 계속하세요.", "No account?": "계정이 없나요?", "Register": "가입",
    "Tasks": "과제", "Create task": "과제 만들기", "Your tasks": "내 과제", "Create": "만들기", "Filters": "필터", "Status": "상태", "Course": "강의", "All": "전체", "Due date": "마감일", "Description": "설명", "Attachments": "첨부", "Choose files": "파일 선택", "Estimated minutes": "예상 시간(분)", "Estimate with AI": "AI로 예상", "Priority (1–5)": "우선순위 (1–5)", "Splittable": "분할 가능", "Plan task": "과제 계획", "Close": "닫기", "Loading tasks...": "과제 불러오는 중...", "No tasks found.": "과제가 없습니다.",
    "Create activity": "활동 만들기", "Your activities": "내 활동", "Refresh": "새로고침", "Title": "제목", "Description (optional)": "설명 (선택)", "Duration (minutes)": "시간(분)", "Preferred date": "희망 날짜", "Location (optional)": "장소 (선택)", "Manual start": "직접 시작", "Manual end": "직접 종료", "Choose date": "날짜 선택", "Choose date and time": "날짜와 시간 선택", "Start time": "시작 시간", "End time": "종료 시간", "Save manually": "직접 저장", "Plan activity": "활동 계획",
    "Open": "열기", "Delete": "삭제", "Account Settings": "계정 설정", "Save changes": "변경 저장", "Saving…": "저장 중…", "Remove avatar": "아바타 제거", "Danger zone": "위험 구역", "Delete account": "계정 삭제", "This action is permanent.": "이 작업은 되돌릴 수 없습니다.", "Create course": "강의 만들기", "Open all tasks": "모든 과제 열기", "Open course": "강의 열기", "Search chats": "채팅 검색", "Write a message. Press Enter to send.": "메시지를 입력하세요. Enter로 전송.", "Send": "전송", "Clear": "지우기", "Emojis": "이모지", "Format": "서식", "Tools": "도구", "Add files": "파일 추가"
  },
  kk: {
    "Dashboard": "Басқару", "Courses": "Курстар", "Activities": "Іс-шаралар", "Daily": "Күн", "Friends": "Достар", "Chat": "Чат", "Statistics": "Статистика", "Settings": "Баптаулар", "Menu": "Мәзір", "Logout": "Шығу", "Light": "Жарық", "Dark": "Қараңғы", "Home": "Басты", "Assistant": "Көмекші",
    "Create account": "Аккаунт жасау", "Start your workspace": "Жұмыс кеңістігін бастау", "Minimal setup — you can change everything later.": "Қарапайым баптау — бәрін кейін өзгерте аласыз.", "New here?": "Жаңадан келдіңіз бе?", "Create a study workspace that already feels organized.": "Бірден реттелген оқу кеңістігін жасаңыз.", "Setup is intentionally lightweight. You can add course art, notes, schedules, and profile details later.": "Баптау жеңіл. Курс суреті, жазба, кесте және профильді кейін қосуға болады.", "Personalized": "Жеке", "Practical": "Ыңғайлы", "Ready to grow": "Өсуге дайын",
    "Name": "Аты", "Email": "Email", "Password": "Құпиясөз", "Language": "Тіл", "Choose avatar": "Аватар таңдау", "PNG or JPG under 1MB.": "1 МБ дейін PNG немесе JPG.", "Already have an account?": "Аккаунтыңыз бар ма?", "Login": "Кіру", "Welcome back": "Қайта қош келдіңіз", "Log in to your workspace": "Жұмыс кеңістігіне кіру", "Use your existing account to continue.": "Жалғастыру үшін аккаунтыңызды қолданыңыз.", "No account?": "Аккаунт жоқ па?", "Register": "Тіркелу",
    "Tasks": "Тапсырмалар", "Create task": "Тапсырма жасау", "Your tasks": "Тапсырмаларыңыз", "Create": "Жасау", "Filters": "Сүзгілер", "Status": "Күйі", "Course": "Курс", "All": "Барлығы", "Due date": "Мерзімі", "Description": "Сипаттама", "Attachments": "Тіркемелер", "Choose files": "Файл таңдау", "Estimated minutes": "Минут", "Estimate with AI": "AI арқылы бағалау", "Priority (1–5)": "Басымдық (1–5)", "Splittable": "Бөлуге болады", "Plan task": "Жоспарлау", "Close": "Жабу", "Loading tasks...": "Тапсырмалар жүктелуде...", "No tasks found.": "Тапсырма жоқ.",
    "Create activity": "Іс-шара жасау", "Your activities": "Іс-шараларыңыз", "Refresh": "Жаңарту", "Title": "Атауы", "Description (optional)": "Сипаттама (міндетті емес)", "Duration (minutes)": "Ұзақтығы (минут)", "Preferred date": "Қалаулы күн", "Location (optional)": "Орны (міндетті емес)", "Manual start": "Басталуы", "Manual end": "Аяқталуы", "Choose date": "Күн таңдау", "Choose date and time": "Күн мен уақыт таңдау", "Start time": "Басталу уақыты", "End time": "Аяқталу уақыты", "Save manually": "Қолмен сақтау", "Plan activity": "Іс-шараны жоспарлау",
    "Open": "Ашу", "Delete": "Жою", "Account Settings": "Аккаунт баптаулары", "Save changes": "Сақтау", "Saving…": "Сақталуда…", "Remove avatar": "Аватарды жою", "Danger zone": "Қауіпті аймақ", "Delete account": "Аккаунтты жою", "This action is permanent.": "Бұл әрекет қайтарылмайды.", "Create course": "Курс жасау", "Open all tasks": "Барлық тапсырмалар", "Open course": "Курсты ашу", "Search chats": "Чат іздеу", "Write a message. Press Enter to send.": "Хабарлама жазыңыз. Enter — жіберу.", "Send": "Жіберу", "Clear": "Тазалау", "Emojis": "Эмодзи", "Format": "Пішім", "Tools": "Құралдар", "Add files": "Файл қосу"
  },
  uz: {
    "Dashboard": "Boshqaruv", "Courses": "Kurslar", "Activities": "Faoliyatlar", "Daily": "Kunlik", "Friends": "Do'stlar", "Chat": "Chat", "Statistics": "Statistika", "Settings": "Sozlamalar", "Menu": "Menyu", "Logout": "Chiqish", "Light": "Yorug'", "Dark": "Qorong'i", "Home": "Bosh sahifa", "Assistant": "Yordamchi",
    "Create account": "Hisob yaratish", "Start your workspace": "Ish joyini boshlang", "Minimal setup — you can change everything later.": "Oddiy sozlash — hammasini keyin o'zgartirasiz.", "New here?": "Yangi foydalanuvchimisiz?", "Create a study workspace that already feels organized.": "Boshidanoq tartibli o'quv maydoni yarating.", "Setup is intentionally lightweight. You can add course art, notes, schedules, and profile details later.": "Sozlash juda yengil. Kurs rasmi, yozuvlar, jadval va profilni keyin qo'shasiz.", "Personalized": "Shaxsiy", "Practical": "Amaliy", "Ready to grow": "Kengayishga tayyor",
    "Name": "Ism", "Email": "Email", "Password": "Parol", "Language": "Til", "Choose avatar": "Avatar tanlash", "PNG or JPG under 1MB.": "1MB dan kichik PNG yoki JPG.", "Already have an account?": "Hisobingiz bormi?", "Login": "Kirish", "Welcome back": "Qaytganingiz bilan", "Log in to your workspace": "Ish joyiga kiring", "Use your existing account to continue.": "Davom etish uchun hisobingizdan foydalaning.", "No account?": "Hisob yo'qmi?", "Register": "Ro'yxatdan o'tish",
    "Tasks": "Vazifalar", "Create task": "Vazifa yaratish", "Your tasks": "Vazifalaringiz", "Create": "Yaratish", "Filters": "Filtrlar", "Status": "Holat", "Course": "Kurs", "All": "Hammasi", "Due date": "Muddat", "Description": "Tavsif", "Attachments": "Biriktirmalar", "Choose files": "Fayl tanlash", "Estimated minutes": "Daqiqa", "Estimate with AI": "AI bilan baholash", "Priority (1–5)": "Muhimlik (1–5)", "Splittable": "Bo'linadi", "Plan task": "Rejalash", "Close": "Yopish", "Loading tasks...": "Vazifalar yuklanmoqda...", "No tasks found.": "Vazifa topilmadi.",
    "Create activity": "Faoliyat yaratish", "Your activities": "Faoliyatlaringiz", "Refresh": "Yangilash", "Title": "Sarlavha", "Description (optional)": "Tavsif (ixtiyoriy)", "Duration (minutes)": "Davomiylik (daqiqa)", "Preferred date": "Afzal sana", "Location (optional)": "Joy (ixtiyoriy)", "Manual start": "Qo'lda boshlash", "Manual end": "Qo'lda tugatish", "Choose date": "Sana tanlash", "Choose date and time": "Sana va vaqt tanlash", "Start time": "Boshlanish vaqti", "End time": "Tugash vaqti", "Save manually": "Qo'lda saqlash", "Plan activity": "Faoliyatni rejalash",
    "Open": "Ochish", "Delete": "O'chirish", "Account Settings": "Hisob sozlamalari", "Save changes": "Saqlash", "Saving…": "Saqlanmoqda…", "Remove avatar": "Avatarni olib tashlash", "Danger zone": "Xavfli hudud", "Delete account": "Hisobni o'chirish", "This action is permanent.": "Bu amal doimiy.", "Create course": "Kurs yaratish", "Open all tasks": "Barcha vazifalar", "Open course": "Kursni ochish", "Search chats": "Chat qidirish", "Write a message. Press Enter to send.": "Xabar yozing. Enter yuboradi.", "Send": "Yuborish", "Clear": "Tozalash", "Emojis": "Emoji", "Format": "Format", "Tools": "Vositalar", "Add files": "Fayl qo'shish"
  },
};

const LanguageContext = createContext(null);
const textOriginals = new WeakMap();
const attrOriginals = new WeakMap();

const EXTRA_PHRASES = {
  ru: {
    "Logged in as": "Вы вошли как",
    "Weekly": "Неделя",
    "Quick Add": "Быстро добавить",
    "Overdue": "Просрочено",
    "past due": "просрочено",
    "Due today": "На сегодня",
    "today": "сегодня",
    "Due this week": "На этой неделе",
    "Mon–Sun": "Пн–Вс",
    "Open tasks": "Открытые задачи",
    "not done": "не завершено",
    "Up next": "Далее",
    "Tasks due this week (not done)": "Задачи на эту неделю (не завершены)",
    "This week": "Эта неделя",
    "Priority": "Приоритет",
    "Your courses": "Ваши курсы",
    "No day": "Без дня",
    "Manage →": "Управлять →",
    "Go to Tasks →": "К задачам →",
    "Quick actions": "Быстрые действия",
    "Common stuff you’ll do a lot": "Частые действия",
    "Create courses": "Создать курсы",
    "Set days/times, add a color, optional banner": "Укажите дни/время, цвет и обложку",
    "Go to Courses": "К курсам",
    "Add tasks": "Добавить задачи",
    "Due date + status makes your dashboard useful": "Срок и статус делают панель полезнее",
    "Go to Tasks": "К задачам",
    "Weekly plan": "План недели",
    "See the week and plan study blocks": "Смотрите неделю и планируйте учебные блоки",
    "Open Weekly": "Открыть неделю",
    "Schedule": "Расписание",
    "Courses + tasks in one place": "Курсы и задачи в одном месте",
    "Calendar": "Календарь",
    "Details": "Детали",
    "Task": "Задача",
    "Planned Task": "Запланированная задача",
    "All day": "Весь день",
    "Shows course meetings, task due dates, and scheduled blocks.": "Показывает занятия, сроки задач и запланированные блоки.",
    "STUDY HUB": "УЧЕБНЫЙ ЦЕНТР",
    "Study hub": "Учебный центр",
    "Courses that feel organized, calm, and easy to scan.": "Курсы, которые легко просматривать и держать в порядке.",
    "Open a course to manage notes, tasks, schedule details, and deadlines together.": "Откройте курс, чтобы управлять заметками, задачами, расписанием и сроками.",
    "Featured course": "Избранный курс",
    "A focused place for notes, tasks, and schedule details.": "Место для заметок, задач и расписания.",
    "Notes, tasks, schedule, and deadlines.": "Заметки, задачи, расписание и сроки.",
    "No course description yet.": "Описание курса пока не добавлено.",
    "PEOPLE & CONVERSATIONS": "ЛЮДИ И ОБЩЕНИЕ",
    "Manage requests, keep classmates close, and jump straight into chat.": "Управляйте заявками, оставайтесь рядом с однокурсниками и быстро переходите в чат.",
    "Add friends by email, accept or block requests, and open direct conversations without leaving your workspace.": "Добавляйте друзей по email, принимайте или блокируйте заявки и открывайте личные чаты.",
    "Open chat page": "Открыть чат",
    "Add a friend": "Добавить друга",
    "Send a request by email.": "Отправьте заявку по email.",
    "Send request": "Отправить заявку",
    "Open self chat": "Открыть чат с собой",
    "Connected": "Подключен",
    "Remove": "Удалить",
    "Block": "Блокировать",
    "Incoming": "Входящие",
    "Sent": "Отправленные",
    "Blocked": "Заблокированные",
    "CONVERSATION HUB": "ЦЕНТР ОБЩЕНИЯ",
    "Chat built for actual work.": "Чат для реальной работы.",
    "Keep direct messages, self notes, polls, timers, and shared bot prompts in one calmer workspace.": "Храните личные сообщения, заметки, опросы, таймеры и бота в одном спокойном пространстве.",
    "Inbox": "Входящие",
    "unread across your space": "непрочитано в пространстве",
    "Task reminder bot": "Бот напоминаний",
    "Task reminders": "Напоминания задач",
    "Notes to self": "Заметки себе",
    "Private notes": "Личные заметки",
    "Group room": "Групповая комната",
    "Direct chat": "Личный чат",
    "Start direct chat": "Начать личный чат",
    "Create group": "Создать группу",
    "messages": "сообщений",
    "Live updates": "Обновления",
    "Select a conversation": "Выберите чат",
    "Choose a chat from the left, start a direct chat, or open your notes-to-self thread.": "Выберите чат слева, начните личный чат или откройте заметки себе.",
    "Choose a chat to start typing.": "Выберите чат, чтобы начать писать.",
    "A calmer workspace for courses, tasks, notes, and friends.": "Спокойное пространство для курсов, задач, заметок и друзей.",
    "Keep your semester organized with a product that feels structured, readable, and built for real daily use.": "Держите семестр в порядке с понятным и удобным продуктом.",
    "Plan intelligently": "Планируйте умно",
    "Review tasks, classes, and daily timelines in one place.": "Смотрите задачи, занятия и день в одном месте.",
    "Stay connected": "Оставайтесь на связи",
    "Message classmates, manage requests, and keep notes nearby.": "Пишите однокурсникам, управляйте заявками и держите заметки рядом.",
    "Move quickly": "Действуйте быстрее",
    "Focused forms, clear hierarchy, and responsive layouts across devices.": "Удобные формы, ясная структура и адаптивный дизайн.",
    "Smart student workspace": "Умное пространство студента",
    "Organize your semester, notes, tasks, and friends in one beautiful place.": "Организуйте семестр, заметки, задачи и друзей в одном красивом месте.",
    "Plan courses, track exams, manage daily work, write AI-assisted notes, and stay connected with your study circle.": "Планируйте курсы, отслеживайте экзамены, задачи, AI-заметки и общение.",
    "Everything in one dashboard": "Все в одной панели",
    "Built for students who want calm structure and fast daily flow.": "Для студентов, которым нужны порядок и быстрый ежедневный процесс.",
    "Calendar clarity": "Понятный календарь",
    "Focused note editor": "Удобный редактор заметок",
    "Built-in chat": "Встроенный чат",
    "Polished dark mode": "Продуманная темная тема",
    "Ready to start?": "Готовы начать?",
    "Open login": "Открыть вход",
    "Create fixed events with the same AI planning flow you already use for tasks.": "Создавайте события с тем же AI-планированием, что и для задач.",
    "Day summary": "Итоги дня",
    "Quick totals for the selected date.": "Краткие итоги выбранной даты.",
    "Courses": "Курсы",
    "Classes and lessons": "Занятия и уроки",
    "Tasks": "Задачи",
    "Due or scheduled work": "Сроки и запланированная работа",
    "Activities": "Активности",
    "Habits and personal plans": "Привычки и личные планы",
    "Busy hours": "Занятые часы",
    "Total timed workload": "Общая нагрузка по времени",
    "All-day items": "События на весь день",
    "Exam": "Экзамен",
    "Previous": "Назад",
    "Next →": "Далее →",
    "Today": "Сегодня",
    "A polished day view with cleaner spacing, stronger dark-mode contrast, and cards that stay inside their lanes.": "Аккуратный дневной вид с чистыми отступами, контрастом и стабильными карточками."
  },
  ko: {
    "Logged in as": "로그인 계정", "Weekly": "주간", "Quick Add": "빠른 추가", "Overdue": "기한 초과", "past due": "지난 기한", "Due today": "오늘 마감", "today": "오늘", "Due this week": "이번 주 마감", "Mon–Sun": "월–일", "Open tasks": "열린 과제", "not done": "미완료", "Up next": "다음 할 일", "Tasks due this week (not done)": "이번 주 마감 과제 (미완료)", "This week": "이번 주", "Priority": "우선순위", "Your courses": "내 강의", "No day": "요일 없음", "Manage →": "관리 →", "Go to Tasks →": "과제로 이동 →", "Quick actions": "빠른 작업", "Common stuff you’ll do a lot": "자주 쓰는 작업", "Create courses": "강의 만들기", "Set days/times, add a color, optional banner": "요일/시간, 색상, 배너 설정", "Go to Courses": "강의로 이동", "Add tasks": "과제 추가", "Due date + status makes your dashboard useful": "마감일과 상태가 대시보드를 유용하게 만듭니다", "Go to Tasks": "과제로 이동", "Weekly plan": "주간 계획", "See the week and plan study blocks": "주간 일정을 보고 학습 블록을 계획하세요", "Open Weekly": "주간 열기", "Schedule": "일정", "Courses + tasks in one place": "강의와 과제를 한곳에", "Calendar": "캘린더", "Details": "상세", "Task": "과제", "Planned Task": "계획된 과제", "All day": "하루 종일", "Shows course meetings, task due dates, and scheduled blocks.": "강의, 과제 마감일, 계획 블록을 보여줍니다.",
    "STUDY HUB": "학습 허브", "Study hub": "학습 허브", "Courses that feel organized, calm, and easy to scan.": "정돈되고 편안하며 훑어보기 쉬운 강의.", "Open a course to manage notes, tasks, schedule details, and deadlines together.": "강의를 열어 노트, 과제, 일정과 마감일을 함께 관리하세요.", "Featured course": "추천 강의", "A focused place for notes, tasks, and schedule details.": "노트, 과제, 일정 정보를 위한 집중 공간.", "Notes, tasks, schedule, and deadlines.": "노트, 과제, 일정, 마감일.", "No course description yet.": "아직 강의 설명이 없습니다.",
    "PEOPLE & CONVERSATIONS": "사람과 대화", "Manage requests, keep classmates close, and jump straight into chat.": "요청을 관리하고 친구와 바로 채팅하세요.", "Add friends by email, accept or block requests, and open direct conversations without leaving your workspace.": "이메일로 친구를 추가하고 요청을 처리하며 바로 대화하세요.", "Open chat page": "채팅 페이지 열기", "Add a friend": "친구 추가", "Send a request by email.": "이메일로 요청을 보내세요.", "Send request": "요청 보내기", "Open self chat": "나에게 쓰기 열기", "Connected": "연결됨", "Remove": "삭제", "Block": "차단", "Incoming": "받은 요청", "Sent": "보낸 요청", "Blocked": "차단됨",
    "CONVERSATION HUB": "대화 허브", "Chat built for actual work.": "실제 작업을 위한 채팅.", "Keep direct messages, self notes, polls, timers, and shared bot prompts in one calmer workspace.": "메시지, 메모, 투표, 타이머, 봇 프롬프트를 한곳에.", "Inbox": "받은함", "unread across your space": "개의 읽지 않음", "Task reminder bot": "과제 알림 봇", "Task reminders": "과제 알림", "Notes to self": "나에게 쓰기", "Private notes": "개인 메모", "Group room": "그룹방", "Direct chat": "개인 채팅", "Start direct chat": "개인 채팅 시작", "Create group": "그룹 만들기", "messages": "메시지", "Live updates": "실시간 업데이트", "Select a conversation": "대화 선택", "Choose a chat from the left, start a direct chat, or open your notes-to-self thread.": "왼쪽에서 채팅을 선택하거나 개인 채팅/나에게 쓰기를 여세요.", "Choose a chat to start typing.": "입력하려면 채팅을 선택하세요.",
    "A calmer workspace for courses, tasks, notes, and friends.": "강의, 과제, 노트, 친구를 위한 차분한 공간.", "Keep your semester organized with a product that feels structured, readable, and built for real daily use.": "읽기 쉽고 실제 사용에 맞춘 제품으로 학기를 정리하세요.", "Plan intelligently": "똑똑하게 계획", "Review tasks, classes, and daily timelines in one place.": "과제, 수업, 하루 일정을 한곳에서 확인하세요.", "Stay connected": "계속 연결", "Message classmates, manage requests, and keep notes nearby.": "친구에게 메시지하고 요청과 노트를 관리하세요.", "Move quickly": "빠르게 이동", "Focused forms, clear hierarchy, and responsive layouts across devices.": "집중된 폼, 명확한 구조, 반응형 레이아웃.",
    "Smart student workspace": "스마트 학생 공간", "Organize your semester, notes, tasks, and friends in one beautiful place.": "학기, 노트, 과제, 친구를 한곳에 정리하세요.", "Plan courses, track exams, manage daily work, write AI-assisted notes, and stay connected with your study circle.": "강의 계획, 시험 추적, 과제 관리, AI 노트, 친구와의 연결.", "Everything in one dashboard": "하나의 대시보드", "Built for students who want calm structure and fast daily flow.": "차분한 구조와 빠른 흐름을 원하는 학생을 위해.", "Calendar clarity": "명확한 캘린더", "Focused note editor": "집중 노트 편집기", "Built-in chat": "내장 채팅", "Polished dark mode": "다듬어진 다크 모드", "Ready to start?": "시작할까요?", "Open login": "로그인 열기",
    "Create fixed events with the same AI planning flow you already use for tasks.": "과제와 같은 AI 계획 흐름으로 고정 일정을 만드세요.", "Day summary": "하루 요약", "Quick totals for the selected date.": "선택한 날짜의 빠른 요약.", "Classes and lessons": "수업과 강의", "Due or scheduled work": "마감 또는 계획된 작업", "Habits and personal plans": "습관과 개인 계획", "Busy hours": "바쁜 시간", "Total timed workload": "총 시간 작업량", "All-day items": "종일 항목", "Exam": "시험", "Previous": "이전", "Next →": "다음 →", "A polished day view with cleaner spacing, stronger dark-mode contrast, and cards that stay inside their lanes.": "깔끔한 간격과 안정적인 카드가 있는 하루 보기."
  },
  kk: {
    "Logged in as": "Кірген аккаунт", "Weekly": "Апта", "Quick Add": "Жылдам қосу", "Overdue": "Мерзімі өтті", "past due": "өтіп кеткен", "Due today": "Бүгінге", "today": "бүгін", "Due this week": "Осы аптада", "Mon–Sun": "Дс–Жс", "Open tasks": "Ашық тапсырмалар", "not done": "аяқталмаған", "Up next": "Келесі", "Tasks due this week (not done)": "Осы апта тапсырмалары (аяқталмаған)", "This week": "Осы апта", "Priority": "Басымдық", "Your courses": "Курстарыңыз", "No day": "Күн жоқ", "Manage →": "Басқару →", "Go to Tasks →": "Тапсырмаларға →", "Quick actions": "Жылдам әрекеттер", "Common stuff you’ll do a lot": "Жиі қолданылатын әрекеттер", "Create courses": "Курстар жасау", "Set days/times, add a color, optional banner": "Күн/уақыт, түс және баннер қосыңыз", "Go to Courses": "Курстарға", "Add tasks": "Тапсырма қосу", "Due date + status makes your dashboard useful": "Мерзім мен күй панельді пайдалы етеді", "Go to Tasks": "Тапсырмаларға", "Weekly plan": "Апталық жоспар", "See the week and plan study blocks": "Аптаны көріп, оқу блоктарын жоспарлаңыз", "Open Weekly": "Аптаны ашу", "Schedule": "Кесте", "Courses + tasks in one place": "Курстар мен тапсырмалар бір жерде", "Calendar": "Күнтізбе", "Details": "Толығырақ", "Task": "Тапсырма", "Planned Task": "Жоспарланған тапсырма", "All day": "Күні бойы", "Shows course meetings, task due dates, and scheduled blocks.": "Курс кездесулері, мерзімдер және жоспарланған блоктар көрсетіледі.",
    "STUDY HUB": "ОҚУ ОРТАЛЫҒЫ", "Study hub": "Оқу орталығы", "Courses that feel organized, calm, and easy to scan.": "Реттелген, тыныш және оңай қаралатын курстар.", "Open a course to manage notes, tasks, schedule details, and deadlines together.": "Курсты ашып, жазба, тапсырма, кесте және мерзімді бірге басқарыңыз.", "Featured course": "Таңдаулы курс", "A focused place for notes, tasks, and schedule details.": "Жазба, тапсырма және кесте үшін ыңғайлы орын.", "Notes, tasks, schedule, and deadlines.": "Жазбалар, тапсырмалар, кесте және мерзімдер.", "No course description yet.": "Курс сипаттамасы әлі жоқ.",
    "PEOPLE & CONVERSATIONS": "АДАМДАР ЖӘНЕ ӘҢГІМЕЛЕР", "Manage requests, keep classmates close, and jump straight into chat.": "Сұрауларды басқарып, достармен бірден чатқа өтіңіз.", "Add friends by email, accept or block requests, and open direct conversations without leaving your workspace.": "Email арқылы дос қосып, сұрауды қабылдап/бұғаттап, чат ашыңыз.", "Open chat page": "Чатты ашу", "Add a friend": "Дос қосу", "Send a request by email.": "Email арқылы сұрау жіберіңіз.", "Send request": "Сұрау жіберу", "Open self chat": "Өзіме чат", "Connected": "Қосылған", "Remove": "Жою", "Block": "Бұғаттау", "Incoming": "Кіріс", "Sent": "Жіберілген", "Blocked": "Бұғатталған",
    "CONVERSATION HUB": "ЧАТ ОРТАЛЫҒЫ", "Chat built for actual work.": "Нақты жұмысқа арналған чат.", "Keep direct messages, self notes, polls, timers, and shared bot prompts in one calmer workspace.": "Хабарламалар, жеке жазбалар, сауалнамалар, таймерлер және ботты бір жерде сақтаңыз.", "Inbox": "Кіріс", "unread across your space": "оқылмаған", "Task reminder bot": "Еске салу боты", "Task reminders": "Тапсырма ескертулері", "Notes to self": "Өзіме жазбалар", "Private notes": "Жеке жазбалар", "Group room": "Топ бөлмесі", "Direct chat": "Жеке чат", "Start direct chat": "Жеке чат бастау", "Create group": "Топ жасау", "messages": "хабар", "Live updates": "Тікелей жаңарту", "Select a conversation": "Чат таңдаңыз", "Choose a chat from the left, start a direct chat, or open your notes-to-self thread.": "Сол жақтан чат таңдаңыз немесе жеке чат/өзіме жазбаны ашыңыз.", "Choose a chat to start typing.": "Жазу үшін чат таңдаңыз.",
    "A calmer workspace for courses, tasks, notes, and friends.": "Курс, тапсырма, жазба және достарға арналған тыныш кеңістік.", "Keep your semester organized with a product that feels structured, readable, and built for real daily use.": "Семестрді түсінікті әрі күнделікті қолдануға ыңғайлы өніммен реттеңіз.", "Plan intelligently": "Ақылды жоспарлау", "Review tasks, classes, and daily timelines in one place.": "Тапсырма, сабақ және күн кестесін бір жерден қараңыз.", "Stay connected": "Байланыста болу", "Message classmates, manage requests, and keep notes nearby.": "Достарға жазыңыз, сұрауларды басқарыңыз, жазбаларды жақын ұстаңыз.", "Move quickly": "Жылдам қозғалу", "Focused forms, clear hierarchy, and responsive layouts across devices.": "Ыңғайлы формалар, анық құрылым және бейімделгіш дизайн.",
    "Smart student workspace": "Ақылды студент кеңістігі", "Organize your semester, notes, tasks, and friends in one beautiful place.": "Семестр, жазба, тапсырма және достарды бір жерде реттеңіз.", "Plan courses, track exams, manage daily work, write AI-assisted notes, and stay connected with your study circle.": "Курстарды жоспарлап, емтиханды бақылап, AI жазбаларымен жұмыс істеңіз.", "Everything in one dashboard": "Барлығы бір панельде", "Built for students who want calm structure and fast daily flow.": "Тыныш құрылым мен жылдам күн тәртібін қалайтын студенттерге.", "Calendar clarity": "Анық күнтізбе", "Focused note editor": "Жазба редакторы", "Built-in chat": "Кіріктірілген чат", "Polished dark mode": "Ыңғайлы қараңғы режим", "Ready to start?": "Бастауға дайынсыз ба?", "Open login": "Кіруді ашу",
    "Create fixed events with the same AI planning flow you already use for tasks.": "Тапсырмалардағы AI жоспарлаумен тұрақты іс-шара жасаңыз.", "Day summary": "Күн қорытындысы", "Quick totals for the selected date.": "Таңдалған күннің қысқа қорытындысы.", "Classes and lessons": "Сабақтар", "Due or scheduled work": "Мерзімі бар немесе жоспарланған жұмыс", "Habits and personal plans": "Әдеттер және жеке жоспарлар", "Busy hours": "Бос емес сағаттар", "Total timed workload": "Жалпы уақыт жүктемесі", "All-day items": "Күні бойғы оқиғалар", "Exam": "Емтихан", "Previous": "Алдыңғы", "Next →": "Келесі →", "A polished day view with cleaner spacing, stronger dark-mode contrast, and cards that stay inside their lanes.": "Таза аралықтары бар, контрастты және тұрақты карточкалы күн көрінісі."
  },
  uz: {
    "Logged in as": "Kirish akkaunti", "Weekly": "Haftalik", "Quick Add": "Tez qo'shish", "Overdue": "Muddati o'tgan", "past due": "muddati o'tgan", "Due today": "Bugun muddat", "today": "bugun", "Due this week": "Bu hafta", "Mon–Sun": "Du–Ya", "Open tasks": "Ochiq vazifalar", "not done": "bajarilmagan", "Up next": "Keyingi", "Tasks due this week (not done)": "Bu hafta vazifalari (bajarilmagan)", "This week": "Bu hafta", "Priority": "Muhimlik", "Your courses": "Kurslaringiz", "No day": "Kun yo'q", "Manage →": "Boshqarish →", "Go to Tasks →": "Vazifalarga →", "Quick actions": "Tez amallar", "Common stuff you’ll do a lot": "Ko'p ishlatiladigan amallar", "Create courses": "Kurslar yaratish", "Set days/times, add a color, optional banner": "Kun/vaqt, rang va banner qo'shing", "Go to Courses": "Kurslarga", "Add tasks": "Vazifa qo'shish", "Due date + status makes your dashboard useful": "Muddat va holat panelni foydali qiladi", "Go to Tasks": "Vazifalarga", "Weekly plan": "Haftalik reja", "See the week and plan study blocks": "Haftani ko'ring va o'qish bloklarini rejalang", "Open Weekly": "Haftalikni ochish", "Schedule": "Jadval", "Courses + tasks in one place": "Kurslar va vazifalar bir joyda", "Calendar": "Kalendar", "Details": "Tafsilotlar", "Task": "Vazifa", "Planned Task": "Rejalangan vazifa", "All day": "Kun bo'yi", "Shows course meetings, task due dates, and scheduled blocks.": "Kurs uchrashuvlari, muddatlar va bloklarni ko'rsatadi.",
    "STUDY HUB": "O'QUV MARKAZI", "Study hub": "O'quv markazi", "Courses that feel organized, calm, and easy to scan.": "Tartibli, sokin va oson ko'riladigan kurslar.", "Open a course to manage notes, tasks, schedule details, and deadlines together.": "Kursni ochib, yozuvlar, vazifalar, jadval va muddatlarni boshqaring.", "Featured course": "Tanlangan kurs", "A focused place for notes, tasks, and schedule details.": "Yozuvlar, vazifalar va jadval uchun qulay joy.", "Notes, tasks, schedule, and deadlines.": "Yozuvlar, vazifalar, jadval va muddatlar.", "No course description yet.": "Kurs tavsifi hali yo'q.",
    "PEOPLE & CONVERSATIONS": "ODAMLAR VA SUHBATLAR", "Manage requests, keep classmates close, and jump straight into chat.": "So'rovlarni boshqaring va tez chatga o'ting.", "Add friends by email, accept or block requests, and open direct conversations without leaving your workspace.": "Email orqali do'st qo'shing, so'rovlarni qabul qiling yoki bloklang.", "Open chat page": "Chatni ochish", "Add a friend": "Do'st qo'shish", "Send a request by email.": "Email orqali so'rov yuboring.", "Send request": "So'rov yuborish", "Open self chat": "O'zimga chat", "Connected": "Ulangan", "Remove": "Olib tashlash", "Block": "Bloklash", "Incoming": "Kiruvchi", "Sent": "Yuborilgan", "Blocked": "Bloklangan",
    "CONVERSATION HUB": "SUHBAT MARKAZI", "Chat built for actual work.": "Haqiqiy ish uchun chat.", "Keep direct messages, self notes, polls, timers, and shared bot prompts in one calmer workspace.": "Xabarlar, shaxsiy yozuvlar, so'rovlar, taymerlar va bot buyruqlarini bir joyda saqlang.", "Inbox": "Kiruvchi", "unread across your space": "o'qilmagan", "Task reminder bot": "Vazifa eslatma boti", "Task reminders": "Vazifa eslatmalari", "Notes to self": "O'zimga yozuvlar", "Private notes": "Shaxsiy yozuvlar", "Group room": "Guruh xonasi", "Direct chat": "Shaxsiy chat", "Start direct chat": "Shaxsiy chat boshlash", "Create group": "Guruh yaratish", "messages": "xabar", "Live updates": "Jonli yangilanishlar", "Select a conversation": "Suhbatni tanlang", "Choose a chat from the left, start a direct chat, or open your notes-to-self thread.": "Chapdan chat tanlang yoki shaxsiy chat/yozuvlarni oching.", "Choose a chat to start typing.": "Yozish uchun chat tanlang.",
    "A calmer workspace for courses, tasks, notes, and friends.": "Kurslar, vazifalar, yozuvlar va do'stlar uchun sokin joy.", "Keep your semester organized with a product that feels structured, readable, and built for real daily use.": "Semestrni tushunarli va kundalik foydalanishga mos mahsulot bilan tartiblang.", "Plan intelligently": "Aqlli rejalang", "Review tasks, classes, and daily timelines in one place.": "Vazifa, dars va kun jadvalini bir joyda ko'ring.", "Stay connected": "Aloqada bo'ling", "Message classmates, manage requests, and keep notes nearby.": "Kursdoshlar bilan yozishing, so'rovlarni boshqaring va yozuvlarni yaqin tuting.", "Move quickly": "Tez harakat qiling", "Focused forms, clear hierarchy, and responsive layouts across devices.": "Qulay formalar, aniq tuzilma va moslashuvchan dizayn.",
    "Smart student workspace": "Aqlli talaba maydoni", "Organize your semester, notes, tasks, and friends in one beautiful place.": "Semestr, yozuvlar, vazifalar va do'stlarni bir joyda tartiblang.", "Plan courses, track exams, manage daily work, write AI-assisted notes, and stay connected with your study circle.": "Kurslarni rejalang, imtihonlarni kuzating, AI yozuvlar bilan ishlang.", "Everything in one dashboard": "Hammasi bitta panelda", "Built for students who want calm structure and fast daily flow.": "Tartib va tezlik xohlaydigan talabalar uchun.", "Calendar clarity": "Aniq kalendar", "Focused note editor": "Qulay yozuv muharriri", "Built-in chat": "Ichki chat", "Polished dark mode": "Yaxshi qorong'i rejim", "Ready to start?": "Boshlashga tayyormisiz?", "Open login": "Kirishni ochish",
    "Create fixed events with the same AI planning flow you already use for tasks.": "Vazifalardagi AI rejalash bilan doimiy tadbirlar yarating.", "Day summary": "Kun xulosasi", "Quick totals for the selected date.": "Tanlangan sana uchun qisqa xulosa.", "Classes and lessons": "Darslar", "Due or scheduled work": "Muddatli yoki rejalangan ish", "Habits and personal plans": "Odatlar va shaxsiy rejalar", "Busy hours": "Band soatlar", "Total timed workload": "Umumiy vaqt yuklamasi", "All-day items": "Kun bo'yi elementlar", "Exam": "Imtihon", "Previous": "Oldingi", "Next →": "Keyingi →", "A polished day view with cleaner spacing, stronger dark-mode contrast, and cards that stay inside their lanes.": "Toza oraliq va barqaror kartalar bilan kun ko'rinishi."
  }
};

function normalize(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function getDictionary(language) {
  return { ...(PHRASES[language] || {}), ...(EXTRA_PHRASES[language] || {}) };
}

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState(() => localStorage.getItem("language") || "en");

  useEffect(() => {
    if (user?.language) setLanguageState(user.language);
  }, [user?.language]);

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
    document.documentElement.dataset.lang = language;
  }, [language]);

  function setLanguage(next) {
    setLanguageState(next || "en");
  }

  function t(value) {
    if (language === "en") return value;
    return getDictionary(language)[normalize(value)] || value;
  }

  useEffect(() => {
    const dictionary = getDictionary(language);
    const translatedValues = new Set(Object.values(dictionary).map(normalize));

    function translateNode(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName?.toLowerCase();
      if (["script", "style", "code", "pre", "textarea"].includes(tag)) return;

      for (const attr of ["placeholder", "title", "aria-label"]) {
        const raw = node.getAttribute?.(attr);
        if (!raw) continue;
        let originals = attrOriginals.get(node);
        if (!originals) {
          originals = {};
          attrOriginals.set(node, originals);
        }
        if (!originals[attr]) originals[attr] = raw;
        const key = normalize(originals[attr]);
        node.setAttribute(attr, language === "en" ? originals[attr] : dictionary[key] || originals[attr]);
      }

      for (const child of node.childNodes || []) {
        if (child.nodeType === Node.TEXT_NODE) {
          const current = child.nodeValue;
          const currentKey = normalize(current);
          const storedOriginal = textOriginals.get(child);
          const storedKey = normalize(storedOriginal);

          if (language === "en") {
            if (storedOriginal && translatedValues.has(currentKey)) child.nodeValue = storedOriginal;
            continue;
          }

          if (dictionary[currentKey]) {
            textOriginals.set(child, current);
            child.nodeValue = current.replace(currentKey, dictionary[currentKey]);
          } else if (storedOriginal && dictionary[storedKey]) {
            child.nodeValue = storedOriginal.replace(storedKey, dictionary[storedKey]);
          }
        } else {
          translateNode(child);
        }
      }
    }

    const root = document.getElementById("root");
    translateNode(root);
    let translating = false;
    const observer = new MutationObserver(() => {
      if (translating) return;
      translating = true;
      observer.disconnect();
      translateNode(root);
      if (root) observer.observe(root, { childList: true, subtree: true });
      translating = false;
    });
    if (root) observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t, languages: LANGUAGES }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
