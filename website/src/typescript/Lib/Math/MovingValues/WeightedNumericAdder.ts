import { WeightedValueHandler } from "./WeightedValueHandler";


/**An weighted adder which supports plain numbers. This sums all values where each has a weight and then 
 * divides the total by the average weight. This gives a sum of the correct scale which favors the values 
 * of higher weights. If each weight is 1 then this simply sums all values normally.*/
export class WeightedNumericAdder implements WeightedValueHandler<number>{
    private sumOfValues = 0;
    private sumOfWeights = 0;
    private valueCount = 0;

    reset(): void {
        this.sumOfValues = 0;
        this.sumOfWeights = 0;
        this.valueCount = 0;
    }
    add(value: number, weight: number): void {
        this.sumOfValues += value * weight;
        this.sumOfWeights += weight;
        this.valueCount ++;
    }
    getFinal(): number {
        if (this.valueCount === 0){
            return 0;
        }
        let weightAverage = this.sumOfWeights / this.valueCount;
        if (weightAverage === 0 ){
            return 0;
        }
        return this.sumOfValues / weightAverage;
    }
}