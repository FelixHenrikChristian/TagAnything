// Type declarations for opencc-js
// https://github.com/nk2028/opencc-js

declare module 'opencc-js' {
    type Locale = 'cn' | 'tw' | 'hk' | 'jp' | 't';

    interface ConverterOptions {
        from: Locale;
        to: Locale;
    }

    type ConverterFunction = (text: string) => string;

    export function Converter(options: ConverterOptions): ConverterFunction;
    export function CustomConverter(dict: string[][]): ConverterFunction;
    export function HTMLConverter(converter: ConverterFunction, startNode: Node, lang: string): void;
}
