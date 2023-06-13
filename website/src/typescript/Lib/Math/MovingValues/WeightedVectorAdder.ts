import { WeightedValueHandler } from "./WeightedValueHandler";
import * as _2D from "../2D";

/**An weighted adder which supports 2D vectors. This sums all vectors where each has a weight and then 
 * divides the total by the average weight. This gives a sum of the correct scale which favors the values 
 * of higher weights. If each weight is 1 then this simply sums all vectors normally.*/
export class WeightedVectorAdder implements WeightedValueHandler<_2D.Vector>{
    private sumOfValues: _2D.Vector = [0, 0];
    private sumOfWeights = 0;
    private valueCount = 0;

    reset(): void {
        this.sumOfValues = [0, 0];
        this.sumOfWeights = 0;
        this.valueCount = 0;
    }
    add(value: _2D.Vector, weight: number): void {
        this.sumOfValues = _2D.add(this.sumOfValues, _2D.mul(value, _2D.toV(weight)));
        this.sumOfWeights += weight;
        this.valueCount ++;
    }
    getFinal(): _2D.Vector {
        if (this.valueCount === 0){
            return [0, 0];
        }
        let weightAverage = this.sumOfWeights / this.valueCount;
        if (weightAverage === 0){
            return [0, 0];
        }
        return _2D.div(this.sumOfValues, _2D.toV(weightAverage));
    }
}