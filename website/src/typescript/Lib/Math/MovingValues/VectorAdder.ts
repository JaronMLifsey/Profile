import { ValueHandler } from "./ValueHandler";
import * as _2D from "../2D";

/**Calculates the sum of the added vectors.*/
export class VectorAdder implements ValueHandler<_2D.Vector>{
    private sumOfValues: _2D.Vector = [0, 0];

    reset(): void {
        this.sumOfValues = [0, 0];
    }
    add(value: _2D.Vector): void {
        this.sumOfValues = _2D.add(this.sumOfValues, value);
    }
    remove(value: _2D.Vector): void {
        this.sumOfValues = _2D.sub(this.sumOfValues, value);
    }
    getValue(): _2D.Vector {
        return this.sumOfValues;
    }
}