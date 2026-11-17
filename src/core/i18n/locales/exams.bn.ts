/** Bangla exams namespace (T-061). Typed against the English key set. */
import type { examsEn } from './exams.en'

export const examsBn: typeof examsEn = {
  title: 'পরীক্ষা',
  createTitle: 'নতুন পরীক্ষা তৈরি করুন',
  batch: 'ব্যাচ',
  subject: 'বিষয়',
  none: 'কোনো বিষয় নেই',
  date: 'তারিখ',
  name: 'পরীক্ষার নাম',
  fullMarks: 'মোট নম্বর',
  passMarks: 'পাস নম্বর',
  create: 'পরীক্ষা তৈরি করুন',
  created: 'পরীক্ষা তৈরি হয়েছে',
  existing: 'বিদ্যমান পরীক্ষা',
  noExams: 'এখনো কোনো পরীক্ষা নেই। নম্বর দিতে উপরে একটি তৈরি করুন।',
  student: 'শিক্ষার্থী',
  marks: 'নম্বর',
  absent: 'অনুপস্থিত',
  present: 'উপস্থিত',
  average: 'ব্যাচ গড়',
  entered: 'প্রবেশকৃত',
  noAverage: '—',
  noRoster: 'এই ব্যাচে কোনো সক্রিয় শিক্ষার্থী ভর্তি নেই।',
  gridHelp:
    'শিক্ষার্থীদের মধ্যে যেতে তীর চিহ্ন, নম্বর সংরক্ষণে এন্টার, অনুপস্থিতি চিহ্নিত করতে স্পেস এবং গ্রিড থেকে বের হতে ট্যাব ব্যবহার করুন।',
  saveFailed: 'নম্বর সংরক্ষণ করা যায়নি — কিছু পরিবর্তন হয়নি।',
  createFailed: 'পরীক্ষা তৈরি করা যায়নি — বিবরণ ও অনন্যতা নিয়ম যাচাই করুন।',
  marksHint: 'মোট নম্বর পর্যন্ত নম্বর প্রবেশ করুন।',
}
