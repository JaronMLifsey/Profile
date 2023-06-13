import { Vector3 } from "../Math/3D";

export type Interpolator<KeyframeType = number, ResultType = KeyframeType> = (a: KeyframeType, b: KeyframeType, percent: number) => ResultType;

export function none<T> (a: T, b: T, percent: number){
    return a;
}
export function linear (start: number, end: number, percent: number){
    return (end - start) * percent + start;
}
export function easeInOut (start: number, end: number, percent: number) {
    //Quadratic of -2x^3+3x^2 mapped to linear interpolation
    return linear(start, end, 3 * Math.pow(percent, 2) - 2 * Math.pow(percent, 3));
}
export function easeIn (start: number, end: number, percent: number) {
    //Quadratic of 6(x/2)^2 - 4(x/2)^3 mapped to linear interpolation
    percent *= 0.5;
    return linear(start, end, 6 * Math.pow(percent, 2) - 4 * Math.pow(percent, 3));
}
export function easeOut (start: number, end: number, percent: number) {
    //Quadratic of 6(x/2+.5)^2 - 4(x/2+.5)^3 -1 mapped to linear interpolation
    percent = percent * 0.5 + 0.5;
    return linear(start, end, 6 * Math.pow(percent, 2) - 4 * Math.pow(percent, 3) - 1);
}
export function getPercent (start: number, end: number, point: number) {
    return (point - start) / (end - start);
}

export function interpolateVector3(v1: Vector3, v2: Vector3, percent: number, interpolationType: Interpolator = easeInOut): Vector3{
    return [
        interpolationType(v1[0], v2[0], percent),
        interpolationType(v1[1], v2[1], percent),
        interpolationType(v1[2], v2[2], percent)
    ];
}