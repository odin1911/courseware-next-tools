export function get(object: any, path: string | string[], defaultVal?: any): any {
  const _path = Array.isArray(path) ? path : path.split('.').filter((i) => i.length);
  if (!object || !_path.length) {
    return object === undefined ? defaultVal : object;
  }
  return get(object[_path.shift()!], _path, defaultVal);
}

export function find(arr: any[], condition: (v: any) => boolean, thisArg?: any): any {
  if (Array.isArray(arr)) {
    const l = arr.length;
    for (let i = 0; i < l; i++) {
      if (condition.call(thisArg, arr[i])) {
        return arr[i];
      }
    }
  }
  return null;
}
