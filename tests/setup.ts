/**
 * Polyfill ImageData for Node.js test environment.
 * The real ImageData is a browser-only API, but our core conversion
 * functions only need the { data, width, height } shape.
 */
if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: string;

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number
    ) {
      if (typeof dataOrWidth === "number") {
        // new ImageData(width, height)
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        // new ImageData(data, width, height?)
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? (dataOrWidth.length / 4 / widthOrHeight);
      }
      this.colorSpace = "srgb";
    }
  };
}
