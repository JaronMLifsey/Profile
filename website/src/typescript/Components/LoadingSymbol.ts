import { fadeIn } from "../Animations/FadeAnimation";
import { hide, getOffsetDimensions } from "../Lib/Util/HtmlUtil";
import { Animation } from "../Lib/Animation/Animation"

/**
 * Spinner HTML/CSS is from https://loading.io/css/ - Thanks!
 */

let container = document.querySelector(".site-body");

export class LoadingSymbol{
    element: HTMLElement;
    animation: Animation | null = null;
    public constructor(){
        this.element = document.createElement("div");
        this.element.classList.add("lds-spinner");
        this.element.innerHTML = "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>";
        hide(this.element);

        document.body.appendChild(this.element);

        if (container === null){
            console.warn(`No element with class="site-body" was present in the document. The loading symbol will be centered to the viewport instead of the site-body.`);
        }

        this.position();
        window.addEventListener("resize", this.position.bind(this));
    }

    private position(){
        let center = this.getCenter();
        let dimensions = getOffsetDimensions(this.element);

        this.element.style.left = `${center.x - dimensions.x / 2}px`;
        this.element.style.top = `${center.y - dimensions.y / 2}px`;
    }

    private getCenter(){
        let centerX: number;
        if (container !== null){
            let bounds = container.getBoundingClientRect();
            centerX = (bounds.left + bounds.right) / 2;
        }
        else{
            centerX = window.innerWidth / 2;
        }
        return {
            x: centerX, 
            y: window.innerHeight / 2
        };
    }

    public reveal(){
        this.animation = fadeIn(this.element);
        this.animation.name = "Loading Fade-in";
    }

    public hide(){
        if (this.animation !== null && !this.animation.isDone()){
            this.animation.completeNextFrame();
            this.animation.postCleanup.add(()=>{
                hide(this.element);
            });
        }
        else{
            hide(this.element);
        }
        this.animation = null;
    }
}