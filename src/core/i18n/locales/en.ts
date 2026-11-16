/** English resources for T-020. Keys are dotted paths (REPO_RULES.md §7.3). */
export const en = {
  translation: {
    app: {
      name: 'Coaching Manager',
      tagline: 'Local & fully offline',
    },
    shell: {
      openNavigation: 'Open navigation menu',
    },
    common: {
      loading: 'Loading…',
    },
    nav: {
      dashboard: 'Dashboard',
      students: 'Students',
      academics: 'Academics',
      enrollments: 'Enrollments',
      payments: 'Payments',
      attendance: 'Attendance',
      exams: 'Exams',
      leaderboard: 'Leaderboard',
      reports: 'Reports',
      dataTools: 'Data tools',
      settings: 'Settings',
    },
    placeholder: {
      description: 'This screen is being built. Navigation and the app shell are in place.',
    },
    error: {
      title: 'Something went wrong',
      description:
        'This screen stopped responding. Your work has not been lost — try again, or go back to the dashboard.',
      draftsTitle: 'Your unsaved values were saved',
      retry: 'Try again',
      goDashboard: 'Go to dashboard',
    },
    notFound: {
      title: 'Page not found',
      description: 'That screen does not exist.',
    },
    settings: {
      storage: 'Storage',
      persistence: 'Persistent storage',
      persistenceChecking: 'Checking…',
      persistenceUnsupported: 'Persistent storage is not supported by this browser.',
      persistenceEnabled: 'Persistent storage is enabled.',
      persistenceDisabled: 'Persistent storage is not enabled.',
    },
    i18n: {
      language: 'Language',
      english: 'English',
      bangla: 'বাংলা',
      banglaDigits: 'Bangla digits',
      sampleNumber: 'Sample number',
    },
  },
}

export type Translation = typeof en.translation
