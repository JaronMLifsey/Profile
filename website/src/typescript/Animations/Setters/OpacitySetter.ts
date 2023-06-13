import { PropertySetter } from "../../Lib/Animation/PropertySetter";
import { StyleState } from "../../Lib/Animation/ElementState";


class OpacitySetter extends PropertySetter<number>{
    constructor(cleanup: boolean = true){
        super(cleanup);
    }
    set(element: HTMLElement, value: number): void {
        element.style.opacity = value.toString();
        element.style.filter = "alpha(opacity=" + value + ")"; //For IE
    }
    getCleanupInternal(){
        return [
            new StyleState("opacity", "", true),
            new StyleState("filter", "", true),//For IE
        ];
    }
}
export const opacitySetter : OpacitySetter = new OpacitySetter();