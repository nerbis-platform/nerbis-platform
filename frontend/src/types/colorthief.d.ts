declare module 'colorthief' {
  type RGBColor = [number, number, number];

  export default class ColorThief {
    getColor(sourceImage: HTMLImageElement, quality?: number): RGBColor;
    getPalette(
      sourceImage: HTMLImageElement,
      colorCount?: number,
      quality?: number
    ): RGBColor[];
  }
}
