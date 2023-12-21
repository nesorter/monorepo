import { secondsInDay, startOfDay, getUnixTime } from 'date-fns';

let startPoint = startOfDay(new Date());
export const getSecondsFromStartOfDay = () => {
  let offset = getUnixTime(new Date()) - getUnixTime(startPoint);
  if (offset > secondsInDay) {
    startPoint = startOfDay(new Date());
    offset = 0;
  }

  return offset;
};
