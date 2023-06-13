import { PropertySetter } from "./PropertySetter";
import { StyleState } from "./ElementState";

/**A Setter for setting arbitrary styles */
export class StyleSetter extends PropertySetter<number>{
    private style: string;
    private postfix: string;

    /**
     * @param style The style to set.
     * @param postfix Anything which should be appended to the final number set. e.g. 'px' for something which is pixels.
     * @param cleanup True if the style should be cleared after the animation completes.
     */
    constructor(style: string, postfix: string, cleanup: boolean = true){
        super(cleanup);
        this.style = style;
        this.postfix = postfix;
    }

    set(element: HTMLElement, value: number): void {
        element.style.setProperty(this.style, value.toString() + this.postfix);
    }
    
    getCleanupInternal(){
        return [new StyleState(this.style, "", true)];
    }
}