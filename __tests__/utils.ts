import {
  createAreKeysEqual,
  createGetKeyIndex,
  createUpdateAsyncCache,
  isSameValueZero,
  mergeOptions,
  orderByLru,
} from '../src/utils';

describe('areKeysEqual', () => {
  it('will return false when the length of the keys are different', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;

    const areKeysEqual = createAreKeysEqual(isEqual);

    const keys1: any[] = [];
    const keys2 = ['key'];

    expect(areKeysEqual(keys1, keys2)).toEqual(false);
  });

  it('will return false when the keys have different values', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;

    const areKeysEqual = createAreKeysEqual(isEqual);

    const keys1 = ['key'];
    const keys2 = ['other key'];

    expect(areKeysEqual(keys1, keys2)).toEqual(false);
  });

  it('will return true when the keys have equal values', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;

    const areKeysEqual = createAreKeysEqual(isEqual);

    const keys1 = ['key'];
    const keys2 = ['key'];

    expect(areKeysEqual(keys1, keys2)).toEqual(true);
  });
});

describe('getKeyIndex', () => {
  it('will return the index of the match found', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;

    const getKeyIndex = createGetKeyIndex({ isEqual, maxSize: 2 });

    const allKeys = [['key'], ['other key']];
    const keyToMatch = ['other key'];

    const result = getKeyIndex(allKeys, keyToMatch);

    expect(result).toEqual(1);
  });

  it('will return -1 of no match found', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;

    const getKeyIndex = createGetKeyIndex({ isEqual });

    const allKeys = [['key'], ['other key']];
    const keyToMatch = ['not present key'];

    const result = getKeyIndex(allKeys, keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will use the isMatchingKey method if passed', () => {
    const isEqual = (o1: any, o2: any) => o1 === o2;
    const isMatchingKey = (o1: any, o2: any) => {
      const existingKey = o1[0];
      const key = o2[0];

      return (
        existingKey.hasOwnProperty('foo') &&
        key.hasOwnProperty('foo') &&
        (existingKey.bar === 'bar' || key.bar === 'baz')
      );
    };

    const getKeyIndex = createGetKeyIndex({ isEqual, isMatchingKey });

    const allKeys = [
      [
        {
          bar: 'bar',
          foo: 'foo',
        },
      ],
    ];
    const keyToMatch = [
      {
        bar: 'baz',
        foo: 'bar',
      },
    ];

    const result = getKeyIndex(allKeys, keyToMatch);

    expect(result).toEqual(0);
  });
});

describe('isSameValueZero', () => {
  it('will return true when the objects are equal', () => {
    const object1 = {};
    const object2 = object1;

    expect(isSameValueZero(object1, object2)).toEqual(true);
  });

  it('will return true when the objects are NaN', () => {
    const object1 = NaN;
    const object2 = NaN;

    expect(isSameValueZero(object1, object2)).toEqual(true);
  });

  it('will return false when the objects are different', () => {
    const object1 = {};
    const object2 = {};

    expect(isSameValueZero(object1, object2)).toEqual(false);
  });
});

describe('mergeOptions', () => {
  it('will merge the extra and provided options into a new object', () => {
    const extraOptions = {
      extra: 'options',
    };
    const providedOptions = {
      provided: 'options',
    };

    const result = mergeOptions(extraOptions, providedOptions);

    expect(result).not.toBe(extraOptions);
    expect(result).not.toBe(providedOptions);
    expect(result).toEqual({ ...extraOptions, ...providedOptions });
  });
});

describe('orderByLru', () => {
  it('will do nothing if the itemIndex is 0', () => {
    const cache = {
      keys: [['first'], ['second'], ['third']],
      size: 3,
      values: ['first', 'second', 'third'],
    };
    const itemIndex = 0;
    const key = cache.keys[itemIndex];
    const value = cache.values[itemIndex];
    const maxSize = 3;

    orderByLru(cache, key, value, itemIndex, maxSize);

    expect(cache).toEqual({
      ...cache,
      keys: [['first'], ['second'], ['third']],
      values: ['first', 'second', 'third'],
    });
  });

  it('will place the itemIndex first in order when non-zero', () => {
    const cache = {
      keys: [['first'], ['second'], ['third']],
      size: 3,
      values: ['first', 'second', 'third'],
    };
    const itemIndex = 1;
    const key = cache.keys[itemIndex];
    const value = cache.values[itemIndex];
    const maxSize = 3;

    orderByLru(cache, key, value, itemIndex, maxSize);

    expect(cache).toEqual({
      ...cache,
      keys: [['second'], ['first'], ['third']],
      values: ['second', 'first', 'third'],
    });
  });

  it('will add the new item to the array when the itemIndex is the array length', () => {
    const cache = {
      keys: [['first'], ['second'], ['third']],
      size: 3,
      values: ['first', 'second', 'third'],
    };
    const itemIndex = cache.keys.length;
    const key = ['key'];
    const value = 'new';
    const maxSize = 4;

    orderByLru(cache, key, value, itemIndex, maxSize);

    expect(cache).toEqual({
      ...cache,
      keys: [key, ['first'], ['second'], ['third']],
      values: [value, 'first', 'second', 'third'],
    });
  });
});

describe('updateAsyncCache', () => {
  it('will fire cache callbacks if resolved', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function) => {
        setTimeout(resolve, timeout);
      });

      return 'resolved';
    };
    const key = ['foo'];
    const memoized = () => {};

    const value = fn();

    const cache = {
      keys: [key],
      size: 1,
      values: [value],
    };
    const options = {
      isEqual: isSameValueZero,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    };

    createUpdateAsyncCache(options)(cache, memoized);

    // this is just to prevent the unhandled rejection noise
    cache.values[0].catch(() => {});

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    expect(options.onCacheHit).toHaveBeenCalledTimes(1);
    expect(options.onCacheHit).toHaveBeenCalledWith(cache, options, memoized);

    expect(options.onCacheChange).toHaveBeenCalledTimes(1);
    expect(options.onCacheChange).toHaveBeenCalledWith(
      cache,
      options,
      memoized,
    );
  });

  it('will remove the key from cache when the promise is rejected', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function, reject: Function) => {
        setTimeout(() => reject(new Error('boom')), timeout);
      });
    };
    const key = ['foo'];
    const value = fn();

    const cache = {
      get size() {
        return cache.keys.length;
      },
      keys: [key],
      values: [value],
    };
    const options = {
      isEqual: isSameValueZero,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    };
    const memoized = () => {};

    createUpdateAsyncCache(options)(cache, memoized);

    const catcher = jest.fn();

    cache.values[0].catch(catcher);

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(catcher).toHaveBeenCalledTimes(1);

    expect(cache).toEqual({
      keys: [],
      size: 0,
      values: [],
    });

    expect(options.onCacheHit).toHaveBeenCalledTimes(0);
    expect(options.onCacheChange).toHaveBeenCalledTimes(0);
  });

  it('will not remove the key from cache when the promise is rejected but the key no longer exists', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function, reject: Function) => {
        setTimeout(() => reject(new Error('boom')), timeout);
      });
    };
    const key = ['foo'];
    const value = fn();

    const cache = {
      get size() {
        return cache.keys.length;
      },
      keys: [key],
      values: [value],
    };
    const options = {
      isEqual: isSameValueZero,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    };
    const memoized = () => {};

    createUpdateAsyncCache(options)(cache, memoized);

    const newValue = cache.values[0];

    const catcher = jest.fn();

    newValue.catch(catcher);

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    cache.keys = [['bar']];
    // @ts-ignore
    cache.values = [Promise.resolve('baz')];

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(catcher).toHaveBeenCalledTimes(1);

    expect(options.onCacheHit).toHaveBeenCalledTimes(0);
    expect(options.onCacheChange).toHaveBeenCalledTimes(0);
  });
});