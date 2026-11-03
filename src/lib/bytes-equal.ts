/** Compare the contents of two byte views, including views into different buffers. */
export function bytesEqual(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
