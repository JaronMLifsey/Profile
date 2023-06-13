import { PropertySetter } from "../../Lib/Animation/PropertySetter";
import { StyleState } from "../../Lib/Animation/ElementState";

export class PxSetter extends PropertySetter<number>{
    attributeName: string;
    constructor(attributeName: string, cleanup: boolean = true){
        super(cleanup);
        this.attributeName = attributeName;
    }
    set(element: HTMLElement, value: number): void {
        element.style.setProperty(this.attributeName, value.toString() + "px");
    }
    getCleanupInternal(){
        return [
            new StyleState(this.attributeName, "", true),
        ];
    }
}