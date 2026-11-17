/** Bangla attendance namespace (T-060). Typed against the English key set. */
import type { attendanceEn } from './attendance.en'

export const attendanceBn: typeof attendanceEn = {
  picker: 'অ্যাটেনডেন সেশন খুলতে একটি ব্যাচ ও তারিখ নির্বাচন করুন।',
  batch: 'ব্যাচ',
  date: 'তারিখ',
  open: 'সেশন খুলুন',
  markAllPresent: 'সবাইকে উপস্থিত করুন',
  student: 'শিক্ষার্থী',
  status: 'অবস্থা',
  present: 'উপস্থিত',
  absent: 'অনুপস্থিত',
  percentage: 'উপস্থিতি',
  presentCount: 'উপস্থিত',
  absentCount: 'অনুপস্থিত',
  totalCount: 'মোট',
  noRoster: 'এই ব্যাচে কোনো সক্রিয় শিক্ষার্থী ভর্তি নেই।',
  loading: 'লোড হচ্ছে…',
  saveFailed: 'অ্যাটেনডেন সংরক্ষণ করা যায়নি — কিছু পরিবর্তন হয়নি।',
  gridHelp: 'চলাচলে তীর চিহ্ন, পরিবর্তনে এন্টার বা স্পেস, গ্রিড থেকে বের হতে ট্যাব ব্যবহার করুন।',
  sessionTitle: 'অ্যাটেনডেন',
}
