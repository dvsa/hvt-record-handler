import handle from '../../src/util/handle-await-error';

jest.unmock('../../src/util/handle-await-error');

describe('handle await error', () => {
  it('returns the value the promise resolves to if the promise is fulfilled', async () => {
    const expected = 123;
    const promise = Promise.resolve(expected);

    const [err, actual] = await handle(promise);

    expect(err).toBe(undefined);
    expect(actual).toEqual(expected);
  });

  it('returns the error the caused the promise to reject', async () => {
    const expectedError = new Error('ooops');
    const promise = Promise.reject(expectedError);

    const [actualError, val] = await handle(promise);

    expect(actualError).toEqual(expectedError);
    expect(val).toBe(undefined);
  });
});
