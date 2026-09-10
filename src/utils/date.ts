import moment from 'moment-jalaali';

/** Today's date in Jalali format (YYYY/MM/DD) */
export function getTodayJalali(): string {
  return moment().format('jYYYY/jMM/jDD');
}

/** Add one Jalali year to a given Jalali date string */
export function getOneYearLaterJalali(dateStr: string): string {
  try {
    return moment(dateStr, 'jYYYY/jMM/jDD').add(1, 'jYear').format('jYYYY/jMM/jDD');
  } catch {
    return '';
  }
}

/** One year from today in Jalali */
export function getOneYearFromTodayJalali(): string {
  return getOneYearLaterJalali(getTodayJalali());
}
