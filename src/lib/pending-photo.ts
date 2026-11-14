// Hands the photo picked in the Add sheet to the /add screen without a round trip.
let pending: File | null = null;
export const setPendingPhoto = (f: File) => { pending = f; };
/** Non-destructive so StrictMode's double initialiser call sees the same file; clear once processing starts. */
export const peekPendingPhoto = () => pending;
export const clearPendingPhoto = () => { pending = null; };
