import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "fr" | "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    settings: "Paramètres",
    users: "Gestion des utilisateurs",
    schedule: "Emploi du temps",
    reports: "Rapports",
    logout: "Déconnexion",
    back: "Retour",

    // Dashboard
    "admin.dashboard": "Tableau de Bord Administration",
    "welcome.admin": "Bienvenue, Admin ",
    "quick.actions": "Actions Rapides",
    "quick.actions.desc": "Accédez rapidement aux fonctionnalités administratives",
    "recent.activity": "Activité Récente",
    "recent.activity.desc": "Dernières actions dans le système",
    "change.view": "Changer de vue",
    "admin.view": "Vue Administration (actuelle)",
    "parent.portal": "Portail Parent",
    "teacher.portal": "Portail Professeur",

    // Stats
    "total.students": "Total Élèves",
    "total.teachers": "Total Professeurs",
    "active.classes": "Classes Actives",
    "generated.reports": "Rapports Générés",

    // Quick Actions
    "user.management": "Gestion Utilisateurs",
    "user.management.desc": "Gérer professeurs et élèves",
    communication: "Communication",
    "communication.desc": "Envoyer messages aux parents/professeurs",
    "school.reports": "Rapports Scolaires",
    "school.reports.desc": "Consulter les statistiques",
    "general.planning": "Planning Général",
    "general.planning.desc": "Gérer les emplois du temps",

    // Recent Activity
    "new.teacher": "Nouveau professeur ajouté",
    "teacher.math": "Prof. Cheikh Diop - Mathématiques",
    "monthly.report": "Rapport mensuel généré",
    "attendance.stats": "Statistiques de présence",
    "hours.ago": "Il y a {{hours}}h",

    // Settings
    "school.info": "Informations de l'école",
    "school.info.desc": "Paramètres généraux de l'établissement",
    "school.name": "Nom de l'école",
    "school.address": "Adresse",
    "school.phone": "Téléphone",
    "school.email": "Email",
    "school.website": "Site web",

    "system.settings": "Paramètres système",
    "system.settings.desc": "Configuration technique du système",
    "system.language": "Langue",
    "system.timezone": "Fuseau horaire",
    "system.dateformat": "Format de date",
    "system.autobackup": "Sauvegarde auto",

    "password.management": "Gestion des mots de passe",
    "password.management.desc": "Modifier les mots de passe des utilisateurs",
    "current.password": "Mot de passe actuel",
    "new.password": "Nouveau mot de passe",
    "confirm.password": "Confirmer le mot de passe",
    "enter.current.password": "Saisir le mot de passe actuel",
    "enter.new.password": "Saisir le nouveau mot de passe",
    "confirm.new.password": "Confirmer le nouveau mot de passe",
    "update.password": "Mettre à jour le mot de passe",

    "save.changes": "Enregistrer les modifications",
    "general.config": "Configuration générale du système",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    settings: "Settings",
    users: "User Management",
    schedule: "Schedule",
    reports: "Reports",
    logout: "Logout",
    back: "Back",

    // Dashboard
    "admin.dashboard": "Administration Dashboard",
    "welcome.admin": "Welcome, Admin ",
    "quick.actions": "Quick Actions",
    "quick.actions.desc": "Quick access to administrative features",
    "recent.activity": "Recent Activity",
    "recent.activity.desc": "Latest system actions",
    "change.view": "Change View",
    "admin.view": "Administration View (current)",
    "parent.portal": "Parent Portal",
    "teacher.portal": "Teacher Portal",

    // Stats
    "total.students": "Total Students",
    "total.teachers": "Total Teachers",
    "active.classes": "Active Classes",
    "generated.reports": "Generated Reports",

    // Quick Actions
    "user.management": "User Management",
    "user.management.desc": "Manage teachers and students",
    communication: "Communication",
    "communication.desc": "Send messages to parents/teachers",
    "school.reports": "School Reports",
    "school.reports.desc": "View statistics",
    "general.planning": "General Schedule",
    "general.planning.desc": "Manage timetables",

    // Recent Activity
    "new.teacher": "New teacher added",
    "teacher.math": "Prof. Cheikh Diop - Mathematics",
    "monthly.report": "Monthly report generated",
    "attendance.stats": "Attendance statistics",
    "hours.ago": "{{hours}}h ago",

    // Settings
    "school.info": "School Information",
    "school.info.desc": "General institution settings",
    "school.name": "School Name",
    "school.address": "Address",
    "school.phone": "Phone",
    "school.email": "Email",
    "school.website": "Website",

    "system.settings": "System Settings",
    "system.settings.desc": "Technical system configuration",
    "system.language": "Language",
    "system.timezone": "Timezone",
    "system.dateformat": "Date Format",
    "system.autobackup": "Auto Backup",

    "password.management": "Password Management",
    "password.management.desc": "Change user passwords",
    "current.password": "Current password",
    "new.password": "New password",
    "confirm.password": "Confirm password",
    "enter.current.password": "Enter current password",
    "enter.new.password": "Enter new password",
    "confirm.new.password": "Confirm new password",
    "update.password": "Update password",

    "save.changes": "Save Changes",
    "general.config": "General system configuration",
  },
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    settings: "الإعدادات",
    users: "إدارة المستخدمين",
    schedule: "الجدول الزمني",
    reports: "التقارير",
    logout: "تسجيل الخروج",
    back: "العودة",

    // Dashboard
    "admin.dashboard": "لوحة تحكم الإدارة",
    "welcome.admin": "مرحباً، المدير عثمان",
    "quick.actions": "الإجراءات السريعة",
    "quick.actions.desc": "الوصول السريع إلى المميزات الإدارية",
    "recent.activity": "النشاط الأخير",
    "recent.activity.desc": "آخر الإجراءات في النظام",
    "change.view": "تغيير العرض",
    "admin.view": "عرض الإدارة (الحالي)",
    "parent.portal": "بوابة الوالدين",
    "teacher.portal": "بوابة المعلمين",

    // Stats
    "total.students": "إجمالي الطلاب",
    "total.teachers": "إجمالي المعلمين",
    "active.classes": "الفصول النشطة",
    "generated.reports": "التقارير المُنشأة",

    // Quick Actions
    "user.management": "إدارة المستخدمين",
    "user.management.desc": "إدارة المعلمين والطلاب",
    communication: "التواصل",
    "communication.desc": "إرسال رسائل للوالدين/المعلمين",
    "school.reports": "تقارير المدرسة",
    "school.reports.desc": "عرض الإحصائيات",
    "general.planning": "الجدول العام",
    "general.planning.desc": "إدارة الجداول الزمنية",

    // Recent Activity
    "new.teacher": "تمت إضافة معلم جديد",
    "teacher.math": "الأستاذ شيخ ديوب - الرياضيات",
    "monthly.report": "تم إنشاء التقرير الشهري",
    "attendance.stats": "إحصائيات الحضور",
    "hours.ago": "منذ {{hours}} ساعات",

    // Settings
    "school.info": "معلومات المدرسة",
    "school.info.desc": "الإعدادات العامة للمؤسسة",
    "school.name": "اسم المدرسة",
    "school.address": "العنوان",
    "school.phone": "الهاتف",
    "school.email": "البريد الإلكتروني",
    "school.website": "الموقع الإلكتروني",

    "system.settings": "إعدادات النظام",
    "system.settings.desc": "التكوين التقني للنظام",
    "system.language": "اللغة",
    "system.timezone": "المنطقة الزمنية",
    "system.dateformat": "تنسيق التاريخ",
    "system.autobackup": "النسخ الاحتياطي التلقائي",

    "password.management": "إدارة كلمات المرور",
    "password.management.desc": "تغيير كلمات مرور المستخدمين",
    "current.password": "كلمة المرور الحالية",
    "new.password": "كلمة مرور جديدة",
    "confirm.password": "تأكيد كلمة المرور",
    "enter.current.password": "أدخل كلمة المرور الحالية",
    "enter.new.password": "أدخل كلمة المرور الجديدة",
    "confirm.new.password": "تأكيد كلمة المرور الجديدة",
    "update.password": "تحديث كلمة المرور",

    "save.changes": "حفظ التغييرات",
    "general.config": "التكوين العام للنظام",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("admin-language");
    return (saved as Language) || "fr";
  });

  useEffect(() => {
    localStorage.setItem("admin-language", language);
    // Update document direction for Arabic
    document.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
