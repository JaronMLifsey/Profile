import { EventDispatcher } from "./EventDispatcher";

export const onWindowResize = new EventDispatcher<[UIEvent]>();
window.onresize = function(ev: UIEvent){
    onWindowResize.dispatch(ev);
}

export const onKeyDown = new EventDispatcher<[KeyboardEvent]>();
window.onkeydown = function(ev: KeyboardEvent){
    onKeyDown.dispatch(ev || window.event);
}