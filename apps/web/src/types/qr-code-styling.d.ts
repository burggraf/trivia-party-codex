declare module 'qr-code-styling' {
  export interface QRCodeStylingOptions {
    width?: number;
    height?: number;
    type?: 'canvas' | 'svg';
    data: string;
    image?: string;
    margin?: number;
    dotsOptions?: Record<string, unknown>;
    cornersSquareOptions?: Record<string, unknown>;
    backgroundOptions?: Record<string, unknown>;
  }

  export default class QRCodeStyling {
    constructor(options: QRCodeStylingOptions);
    append(element: HTMLElement): void;
    update(options: Partial<QRCodeStylingOptions>): void;
  }
}
