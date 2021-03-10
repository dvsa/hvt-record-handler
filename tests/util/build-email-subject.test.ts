import { Availability, BuildEmailBodyParams } from '../../src/types';
import buildEmailSubject from '../../src/util/build-email-subject';

jest.unmock('light-date');
jest.unmock('../../src/util/build-email-subject');

describe('build email subject', () => {
  it('it builds proper message when availability is set to true', () => {
    const params: BuildEmailBodyParams = {
      atfName: 'Some ATF name',
      availability: {
        isAvailable: true,
        startDate: '2020-11-09T00:00:00.000Z',
        endDate: '2020-12-07T00:00:00.000Z',
      } as Availability,
    } as BuildEmailBodyParams;

    expect(buildEmailSubject(params)).toBe(
      'Some ATF name can take more MOT bookings between 09 November 2020 and 07 December 2020',
    );
  });

  it('it builds proper message when availability is set to false', () => {
    const params: BuildEmailBodyParams = {
      atfName: 'Some ATF name',
      availability: {
        isAvailable: false,
        startDate: '2020-11-09T00:00:00.000Z',
        endDate: '2020-12-07T00:00:00.000Z',
      } as Availability,
    } as BuildEmailBodyParams;

    expect(buildEmailSubject(params)).toBe(
      'Some ATF name is fully booked between 09 November 2020 and 07 December 2020',
    );
  });
});
