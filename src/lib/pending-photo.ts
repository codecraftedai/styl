// Hands the photos picked in the Add sheet to the /add screen without a round trip.
let pending: File[] | null = null;
export const setPendingPhotos = (f: File[]) => { pending = f.length ? f : null; };
/** Non-destructive so StrictMode's double initialiser call sees the same files; clear once processing starts. */
export const peekPendingPhotos = () => pending;
export const clearPendingPhotos = () => { pending = null; };
