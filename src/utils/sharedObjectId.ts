/**
 * Returns a SharedObject's registry id (a number) so it can be passed as a native view prop.
 *
 * Why: expo-modules-core only started auto-unwrapping shared objects passed as view props in
 * 56.0.13 (expo/expo#46212). On older SDK 56 patches a raw shared object does not survive the
 * Fabric prop pipeline (it serializes to an empty value), so the native `Prop` is never set and the
 * view stays blank. Passing the registry id explicitly works on every version — the native side
 * resolves the id back to the object (expo/expo#24431), and array props resolve element-wise.
 *
 * Non-shared-object values (null / undefined / already a number) pass through unchanged, so this is
 * also a no-op once #46212 is present. Callers map it over array props.
 */
export function sharedObjectId<T>(value: T): T {
  const id = (value as { __expo_shared_object_id__?: number } | null | undefined)
    ?.__expo_shared_object_id__;
  return (typeof id === 'number' ? id : value) as T;
}
