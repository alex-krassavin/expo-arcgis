import { useEffect, useRef, type DependencyList, type EffectCallback } from 'react';

/** Like `useEffect`, but skips the first (mount) invocation — initial props are applied
 *  in the SharedObject constructor, so reconciliation should run only on updates. */
export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useUpdateEffect;
