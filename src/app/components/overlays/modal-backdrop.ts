/** Ignore synthetic clicks after the native file picker closes (they hit the modal overlay). */
export function backdropMouseDown(event: MouseEvent): boolean {
  return event.target === event.currentTarget;
}

export function backdropMouseUp(event: MouseEvent, pressedOnBackdrop: boolean): boolean {
  return pressedOnBackdrop && event.target === event.currentTarget;
}
