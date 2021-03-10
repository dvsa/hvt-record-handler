import type { Template } from 'nunjucks';

export interface Availability {
  lastUpdated: string,
  startDate: string,
  endDate: string,
  isAvailable: boolean,
}

export interface ATF {
  id: string,
  name: string,
  email: string,
  token: string,
  [key: string]: unknown,
}

export type AvailabilityChangeData = {
  oldAvailability?: Availability,
  newAvailability?: Availability,
} & ATF;

export interface BuildEmailBodyParams {
  availableTemplate: Template,
  fullyBookedTemplate: Template,
  atfName: string,
  availability: Availability,
  token: string,
  emailLinkBaseUrl: string,
}
