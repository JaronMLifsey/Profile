import { WeightedValueHandler } from "./WeightedValueHandler";

/**An weighted averager which supports plain numbers. */
export class WeightedNumericAverager implements WeightedValueHandler<number>{
    private weightSum = 0;
    private sum = 0;

    reset(): void {
        this.weightSum = 0;
        this.sum = 0;
    }
    add(value: number, weight: number): void {
        this.sum += value * weight;
        this.weightSum += weight;
    }
    
    getFinal(): number {
        if (this.weightSum === 0){
            return 0;
        }
        return this.sum / this.weightSum;
    }
}