import { PropertySetter } from "../../Lib/Animation/PropertySetter";
import { StyleState } from "../../Lib/Animation/ElementState";

export class ScaleSetter extends PropertySetter<number>{
    attributeName: string;
    constructor(attributeName: string, cleanup: boolean = true){
        super(cleanup);
        this.attributeName = attributeName;
    }
    set(element: HTMLElement, value: number): void {
        element.style.transform = "scale(" + value + ")";
    }
    getCleanupInternal(){
        return [
            new StyleState("transform", "", true),
        ];
    }
}