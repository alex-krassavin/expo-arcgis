/** A shared object's registry id, which survives the view-prop pipeline on every SDK 56 patch. */
export function registryId(value: unknown): unknown {
  const id = (value as { __expo_shared_object_id__?: number } | null)?.__expo_shared_object_id__;
  return typeof id === 'number' ? id : value;
}
