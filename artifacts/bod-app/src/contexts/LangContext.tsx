import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "ar" | "en";

const translations = {
  en: {
    // Nav
    dashboard: "Dashboard",
    spaces: "Spaces",
    timeline: "Timeline",
    history: "History",
    members: "Members",
    senders: "Senders",
    settings: "Settings",
    menu: "Menu",
    workspace: "Workspace",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    mySpaces: "My Spaces",

    // Auth
    welcomeBack: "Welcome back",
    signInSubtitle: "Sign in to your workspace account",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    fullName: "Full Name",
    confirmPassword: "Confirm Password",

    // Spaces
    newSpace: "New Space",
    searchSpaces: "Search spaces...",
    createSpace: "Create Space",
    spaceName: "Name",
    spaceDesc: "Description",
    spaceColor: "Color",
    noSpacesFound: "No spaces found",
    createFirstSpace: "Create your first space to start organizing tasks.",
    notInAnySpace: "You haven't been added to any spaces yet.",
    tasks: "tasks",
    membersLabel: "members",
    creating: "Creating...",
    cancel: "Cancel",

    // SpaceDetail tabs
    overview: "Overview",
    tasksTab: "Tasks",
    timelineTab: "Timeline",
    membersTab: "Members",
    data: "Data",

    // Data tab
    filesLinks: "Files & Links",
    newFolder: "New Folder",
    addLink: "Add Link",
    createFolder: "Create Folder",
    emptyFolder: "Empty folder",
    noFilesYet: "No files or links yet",
    noFilesDesc: "Create folders and add links to organize your space resources.",

    // Tasks
    newTask: "New Task",
    createTask: "Create Task",
    taskTitle: "Task title...",
    description: "Description",
    status: "Status",
    priority: "Priority",
    deadline: "Deadline",
    estimatedHours: "Est. Hours",
    assignMembers: "Assign Members",
    sender: "Sender",
    noTasksYet: "No tasks yet",
    progress: "Progress",
    activity: "Activity",
    writeComment: "Write a comment...",
    sendReminder: "Send Reminder",
    backToSpace: "Back to space",

    // Settings
    profileSettings: "Profile Settings",
    webhookSettings: "Webhook Settings",
    saveChanges: "Save Changes",
    saving: "Saving...",

    // Common
    loading: "Loading...",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    save: "Save",
    search: "Search...",
    noResults: "No results",
    overdue: "Overdue",
    dueSoon: "Due Soon",
    inProgress: "In Progress",
    done: "Done",
    today: "Today",
    tomorrow: "Tomorrow",
    allCaughtUp: "All caught up!",
    noPendingTasks: "No pending tasks assigned to you.",
    notifications: "Notifications",
    viewAllTasks: "View all my tasks →",
    totalTasks: "Total Tasks",
    completion: "Completion",
    upcomingDeadlines: "Upcoming Deadlines",
    teamMembers: "Team Members",
    manage: "Manage",
    noMembersYet: "No members added yet",
    noUpcomingDeadlines: "No upcoming deadlines",
    addMember: "Add Member",
    removeMember: "Remove",
    selectMember: "Select a member...",
    spaceMembersTitle: "Space Members",
    noMembersInSpace: "No members in this space",
    completed: "Completed",
    created: "Created",
    estimatedHoursLabel: "Estimated Hours",
    noActivityYet: "No activity yet",
  },
  ar: {
    // Nav
    dashboard: "لوحة التحكم",
    spaces: "المساحات",
    timeline: "الجدول الزمني",
    history: "السجل",
    history2: "التاريخ",
    members: "الأعضاء",
    senders: "المرسلون",
    settings: "الإعدادات",
    menu: "القائمة",
    workspace: "مساحة العمل",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    mySpaces: "مساحاتي",

    // Auth
    welcomeBack: "مرحباً بك",
    signInSubtitle: "سجّل دخولك لحساب مساحة العمل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جاري الدخول...",
    noAccount: "ليس لديك حساب؟",
    signUp: "إنشاء حساب",
    createAccount: "إنشاء حساب",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    fullName: "الاسم الكامل",
    confirmPassword: "تأكيد كلمة المرور",

    // Spaces
    newSpace: "مساحة جديدة",
    searchSpaces: "ابحث عن مساحة...",
    createSpace: "إنشاء مساحة",
    spaceName: "الاسم",
    spaceDesc: "الوصف",
    spaceColor: "اللون",
    noSpacesFound: "لا توجد مساحات",
    createFirstSpace: "أنشئ مساحتك الأولى لتبدأ تنظيم المهام.",
    notInAnySpace: "لم تُضف إلى أي مساحة بعد.",
    tasks: "مهام",
    membersLabel: "أعضاء",
    creating: "جاري الإنشاء...",
    cancel: "إلغاء",

    // SpaceDetail tabs
    overview: "نظرة عامة",
    tasksTab: "المهام",
    timelineTab: "الجدول",
    membersTab: "الأعضاء",
    data: "الملفات",

    // Data tab
    filesLinks: "الملفات والروابط",
    newFolder: "مجلد جديد",
    addLink: "إضافة رابط",
    createFolder: "إنشاء مجلد",
    emptyFolder: "مجلد فارغ",
    noFilesYet: "لا توجد ملفات أو روابط",
    noFilesDesc: "أنشئ مجلدات وأضف روابط لتنظيم موارد مساحتك.",

    // Tasks
    newTask: "مهمة جديدة",
    createTask: "إنشاء مهمة",
    taskTitle: "عنوان المهمة...",
    description: "الوصف",
    status: "الحالة",
    priority: "الأولوية",
    deadline: "الموعد النهائي",
    estimatedHours: "الساعات المقدّرة",
    assignMembers: "تعيين الأعضاء",
    sender: "المرسل",
    noTasksYet: "لا توجد مهام بعد",
    progress: "التقدم",
    activity: "النشاط",
    writeComment: "اكتب تعليقاً...",
    sendReminder: "إرسال تذكير",
    backToSpace: "العودة للمساحة",

    // Settings
    profileSettings: "إعدادات الملف الشخصي",
    webhookSettings: "إعدادات Webhook",
    saveChanges: "حفظ التغييرات",
    saving: "جاري الحفظ...",

    // Common
    loading: "جاري التحميل...",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    save: "حفظ",
    search: "بحث...",
    noResults: "لا توجد نتائج",
    overdue: "متأخر",
    dueSoon: "قريب الموعد",
    inProgress: "قيد التنفيذ",
    done: "مكتمل",
    today: "اليوم",
    tomorrow: "غداً",
    allCaughtUp: "أنت محدّث!",
    noPendingTasks: "لا توجد مهام معلّقة معيّنة لك.",
    notifications: "الإشعارات",
    viewAllTasks: "عرض كل مهامي ←",
    totalTasks: "إجمالي المهام",
    completion: "الإنجاز",
    upcomingDeadlines: "المواعيد القادمة",
    teamMembers: "أعضاء الفريق",
    manage: "إدارة",
    noMembersYet: "لم يُضف أعضاء بعد",
    noUpcomingDeadlines: "لا توجد مواعيد قادمة",
    addMember: "إضافة عضو",
    removeMember: "إزالة",
    selectMember: "اختر عضواً...",
    spaceMembersTitle: "أعضاء المساحة",
    noMembersInSpace: "لا يوجد أعضاء في هذه المساحة",
    completed: "مكتمل",
    created: "تاريخ الإنشاء",
    estimatedHoursLabel: "الساعات المقدّرة",
    noActivityYet: "لا يوجد نشاط بعد",
  },
} as const;

export type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
  isRTL: false,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("bod-lang") as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("bod-lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  // Apply on mount
  const t = translations[lang] as Translations;
  const isRTL = lang === "ar";

  // Set dir on initial render
  if (typeof document !== "undefined") {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
