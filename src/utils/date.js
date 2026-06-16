import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');

export function formatTanggal(d) {
  if (!d) return '';
  return dayjs(d).format('dddd, D MMMM YYYY');
}
