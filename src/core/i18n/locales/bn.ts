/**
 * Bangla resources for T-020. Typed against the English key set so the two bundles cannot
 * drift; conjunct shaping comes from the self-hosted Noto Sans Bengali font with `lang="bn"`.
 */
import type { Translation } from './en'

export const bn: { translation: Translation } = {
  translation: {
    app: {
      name: 'Coaching Manager',
      tagline: 'স্থানীয় ও সম্পূর্ণ অফলাইন',
    },
    shell: {
      openNavigation: 'নেভিগেশন মেনু খুলুন',
    },
    singleTab: {
      title: 'অন্য ট্যাবে ইতিমধ্যে খোলা আছে',
      description:
        'কোচিং ম্যানেজার এই ব্রাউজারের অন্য একটি ট্যাবে ইতিমধ্যে চলছে। এই ট্যাবটি বন্ধ করে যেটি আগে খোলা আছে সেটি ব্যবহার করুন — আপনার ডেটা এই ডিভাইসেই থাকে।',
    },
    common: {
      loading: 'লোড হচ্ছে…',
    },
    nav: {
      dashboard: 'ড্যাশবোর্ড',
      students: 'শিক্ষার্থী',
      academics: 'একাডেমিক',
      enrollments: 'ভর্তি',
      payments: 'অর্থ প্রদান',
      attendance: 'উপস্থিতি',
      exams: 'পরীক্ষা',
      leaderboard: 'লিডারবোর্ড',
      reports: 'রিপোর্ট',
      dataTools: 'ডেটা টুলস',
      settings: 'সেটিংস',
    },
    placeholder: {
      description: 'এই স্ক্রিনটি তৈরি করা হচ্ছে। নেভিগেশন এবং অ্যাপ শেল প্রস্তুত।',
    },
    error: {
      title: 'কিছু একটা ভুল হয়েছে',
      description:
        'এই স্ক্রিনটি সাড়া দিচ্ছে না। আপনার কাজ হারিয়ে যায়নি — আবার চেষ্টা করুন, অথবা ড্যাশবোর্ডে ফিরে যান।',
      draftsTitle: 'আপনার অসংরক্ষিত মানগুলো সংরক্ষিত হয়েছে',
      retry: 'আবার চেষ্টা করুন',
      goDashboard: 'ড্যাশবোর্ডে যান',
    },
    notFound: {
      title: 'পেইজ পাওয়া যায়নি',
      description: 'সেই স্ক্রিনটি বিদ্যমান নেই।',
    },
    undo: {
      done: 'সম্পন্ন',
      undo: 'ফিরিয়ে আনুন',
      failed: 'সেই পরিবর্তনটি ফিরিয়ে আনা যায়নি।',
      history: 'ইতিহাস',
      empty: 'এখনো কোনো পরিবর্তন রেকর্ড করা হয়নি।',
      restore: 'এই সংস্করণটি পুনরুদ্ধার করুন',
      action: {
        create: 'তৈরি করা হয়েছে',
        update: 'হালনাগাদ হয়েছে',
        delete: 'মুছে ফেলা হয়েছে',
        void: 'বাতিল করা হয়েছে',
        restore: 'পুনরুদ্ধার হয়েছে',
      },
    },
    settings: {
      storage: 'সংরক্ষণ',
      persistence: 'স্থায়ী সংরক্ষণ',
      persistenceChecking: 'পরীক্ষা করা হচ্ছে…',
      persistenceUnsupported: 'এই ব্রাউজারে স্থায়ী সংরক্ষণ সমর্থিত নয়।',
      persistenceEnabled: 'স্থায়ী সংরক্ষণ সক্রিয় আছে।',
      persistenceDisabled: 'স্থায়ী সংরক্ষণ সক্রিয় নেই।',
    },
    i18n: {
      language: 'ভাষা',
      english: 'English',
      bangla: 'বাংলা',
      banglaDigits: 'বাংলা অঙ্ক',
      sampleNumber: 'নমুনা সংখ্যা',
    },
  },
}
