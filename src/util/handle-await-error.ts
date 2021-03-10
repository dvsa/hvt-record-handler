export default <T, E = Error>(promise: Promise<T>): Promise<readonly [undefined, T] | readonly [E]> => promise
  .then((data: T): readonly [undefined, T] => [undefined, data])
  .catch((err: E): readonly [E] => [err]);
