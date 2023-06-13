
import { State } from "./ElementState";

/**
 * A class which can set attributes on Elements according to data provided by an interpolator.
 * e.g. an interpolator might return a number and a specific setter might take that number and assign it to an element.style.height attribute.
 */
export abstract class PropertySetter<DataType, TargetType = HTMLElement>{
    private cleanup: boolean;
    /**
     * @param cleanup If true, the attributes set during an animation tick by this Setter will be cleared when the animation completes.
     */
    constructor(cleanup: boolean){
        this.cleanup = cleanup;
    }
    public abstract set (element: TargetType, value: DataType, percent: number): void;
    /**Returns the States which will be applied during the animation cleanup stage.
     * These do not need to be passed to the animation on creation, it will handle that automatically.*/
    public getCleanup(): State<TargetType>[]{
        if (this.cleanup){
            return this.getCleanupInternal();
        }
        return [];
    }
    protected abstract getCleanupInternal(): State<TargetType>[];
}