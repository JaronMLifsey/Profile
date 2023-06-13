import { PropertySetter } from "../../Lib/Animation/PropertySetter";
import { StyleState } from "../../Lib/Animation/ElementState";
import { Vector3 } from "../../Lib/Math/3D";

export class TranslateSetter extends PropertySetter<Vector3>{
    private postfix: string;
    private currentFirst: boolean | null;

    /**
     * @param currentFirst If null, the transform will be cleared and set only to this translation, otherwise: if true, this transform
     * will be applied after the current transform and if false, it will be applied before the current transform.
     * NOTE: This should be null unless there is another setter which modifies the style.transform property otherwise it will continuously add to that property every frame.
     * @param postfix The string to append to the numbers set (e.g. 100px vs 100%).
     * NOTE: This does not apply to the z component which will always be postfixed with 'px'
     * @param cleanup If true, the attributes set during the animation will be cleared after the animation completes. DEFAULT = true
     */
    constructor(currentFirst: boolean | null = null, postfix: string = "px", cleanup: boolean = true){
        super(cleanup);
        this.postfix = postfix;
        this.currentFirst = currentFirst;
    }
    set(element: HTMLElement, vector: Vector3): void {
        let translation = "translate3d(" + vector.join(this.postfix + ",") + "px)";
        if (this.currentFirst === null){
            element.style.transform = translation;
        }
        else if (this.currentFirst){
            element.style.transform = element.style.transform + translation;
        }
        else{
            element.style.transform = translation + element.style.transform;
        }
    }
    getCleanupInternal(){
        return [
            new StyleState("transform", "", true),
        ];
    }
}