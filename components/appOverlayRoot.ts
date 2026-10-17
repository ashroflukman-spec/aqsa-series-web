export function getAppOverlayRoot(): HTMLElement {
  return document.querySelector<HTMLElement>(".aqsa-ipad-stage.is-active .aqsa-iphone-screen") ?? document.body;
}
