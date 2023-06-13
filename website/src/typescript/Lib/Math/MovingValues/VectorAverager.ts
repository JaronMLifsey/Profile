import { ValueHandler } from "./ValueHandler";
import * as _2D from "../2D";

/**Calculates the average of the added vectors.*/
export class VectorAverager implements ValueHandler<_2D.Vector>{
    private sumOfValues: _2D.Vector = [0, 0];
    private valueCount = 0;

    reset(): void {
        this.sumOfValues = [0, 0];
        this.valueCount = 0;
    }
    add(value: _2D.Vector): void {
        this.sumOfValues = _2D.add(this.sumOfValues, value);
        this.valueCount ++;
    }
    remove(value: _2D.Vector): void {
        this.sumOfValues = _2D.sub(this.sumOfValues, value);
        this.valueCount --;
    }
    getValue(): _2D.Vector {
        return _2D.div(this.sumOfValues, _2D.toV(this.valueCount));
    }
}