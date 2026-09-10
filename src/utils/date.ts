import moment from 'moment-jalaali';

/** Returns today's date in Jalali format YYYY/MM/DD */
export const getTodayJalali = (): string => moment().format('jYYYY/jMM/jDD');

/** Adds one Jalali year to a given Jalali date string */
export const getOneYearLaterJalali = (dateStr: string): string => {
  try {
    return moment(dateStr, 'jYYYY/jMM/jDD').add(1, 'jYear').format('jYYYY/jMM/jDD');
  } catch {
    return '';
  }
};

/** Adds one Jalali year to today */
export const getOneYearFromTodayJalali = (): string => getOneYearLaterJalali(getTodayJalali());
