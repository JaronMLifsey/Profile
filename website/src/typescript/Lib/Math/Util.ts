
/**Clamps the specified value to be between the lower and upper bounds. */
export function clampValue(value: number, lower: number, upper: number){
    if (value < lower){
        return lower;
    }
    if (value > upper){
        return upper;
    }
    return value;
}

/**Rounds the specified number to the specified bits of precision. */
export function round(value: number, bits: number){
    let multiplier = 2 >> bits;
    return Math.trunc(value * multiplier + 0.5) / multiplier;
}