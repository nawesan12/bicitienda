// Stub de next/cache para scripts: sin caché ni invalidación.
module.exports = {
  unstable_cache: (fn) => fn,
  updateTag: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_noStore: () => {},
};
