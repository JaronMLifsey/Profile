import { PropertySetter } from "../../Lib/Animation/PropertySetter";
import { StyleState } from "../../Lib/Animation/ElementState";
import { Vector3 } from "../../Lib/Math/3D";


export class RotateSetter extends PropertySetter<number>{
    point: Vector3;
    constructor(point: Vector3, cleanup: boolean = true){
        super(cleanup);
        this.point = point;
    }
    set(element: HTMLElement, angle: number): void {
        let negTranslation = "translate3d(" + -this.point[0] + "px," + -this.point[1] + "px," + -this.point[2] + "px)";
        let rotation = "rotate3d(0,1,0," + angle + "rad)";
        let translation = "translate3d(" + this.point.join("px,") + "px)";
        //Note that Edge does not handle the perspective attribute properly with backface-visibility. It will work if below is used.
        // let perspective = "perspective(" + this.cameraDistance + "px)";

        element.style.transform = translation + rotation + negTranslation;
    }
    getCleanupInternal(){
        return [
            new StyleState("transform", "", true),
        ];
    }
}