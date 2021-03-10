import { format, localeFormat } from 'light-date';
import { BuildEmailBodyParams } from '../types';

export default (params: BuildEmailBodyParams): string => {
  const startDate: Date = new Date(params.availability.startDate);
  const endDate: Date = new Date(params.availability.endDate);
  const startDateString: string = format(startDate, `{dd} ${localeFormat(startDate, '{MMMM}')} {yyyy}`);
  const endDateString: string = format(endDate, `{dd} ${localeFormat(endDate, '{MMMM}')} {yyyy}`);
  const availabilityDecision: string = params.availability.isAvailable
    ? 'can take more MOT bookings'
    : 'is fully booked';

  return `${params.atfName} ${availabilityDecision} between ${startDateString} and ${endDateString}`;
};
