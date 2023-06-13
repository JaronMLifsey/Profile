import { slideUp, slideDown } from "../Animations/SlideAnimation";
import { onWindowResize } from "../Lib/Util/Events";
import { PageManager } from "../PageManager/PageManager";

//How long the slide up and slide down animations take for sub-page links
const animationDuration = 250;

export abstract class Link{
    public readonly pageRef: string;
    public abstract get parent(): Link | null;
    public abstract get children(): Link[];
    public abstract get defaultLeaf(): Link;
    public abstract get defaultChild(): Link | null;

    constructor(pageRef: string){
        this.pageRef = pageRef;
    }
}

class LinkImpl extends Link{
    public parent: LinkImpl | null = null;
    public readonly children: LinkImpl[] = [];
    public readonly element: HTMLElement;

    private readonly childLinkContainer: HTMLElement | null;

    constructor(pageRef: string, element: HTMLElement, pageManager: PageManager){
        super(pageRef);
        this.element = element;

        this.childLinkContainer = document.querySelector(`.sub-page-links[pageRef="${pageRef}"]`);
        
        let node = pageManager.pageNodes.get(pageRef);
        if (node === undefined){
            throw `There is no page for this link (pageRef = ${pageRef}`;
        }

        //Setup initial selected state
        if (node.isSelectedChild){
            this.select();
        }

        //Listen for page swaps to update the styles.
        node.onSelected.add(this.select.bind(this));
        node.onDeselected.add(this.deselect.bind(this));
    }

    /**
     * Returns the default leaf node starting from this link. If there are no children this will return itself.
     */
    public get defaultLeaf(): LinkImpl{
        let link: LinkImpl = this;
        while (link.children.length > 0){
            link = link.children[0];
        }
        return link;
    }
    /**
     * Returns the default child link or itself if it has no children.
     */
    public get defaultChild(): LinkImpl | null{
        if (this.children.length === 0){
            return null;
        }
        return this.children[0];
    }

    private deselect(){
        this.element.classList.remove("selected");
        if (this.childLinkContainer !== null){
            slideUp(this.childLinkContainer, animationDuration);
        }
    }
    private select(){
        this.element.classList.add("selected");
        if (this.childLinkContainer !== null){
            slideDown(this.childLinkContainer, animationDuration);
        }
    }
}

/**
 * The Legend is the site's navigation component and also acts, internally, as the manifest for the whole site.
 * It contains Links and each link points to one page. Having a manifest from the start is necessary as pages can
 * be contained within other pages, which requires that when a page is loaded dynamically, it's parent is also
 * loaded. This can only be done by knowing their relationship beforehand which is not fully defined by the pageRef
 * used to link to specific pages (they are just file paths to a template and theres no way to know which part is
 * folder and which part is page).
 */
export class Legend{
    private linkMapImpl = new Map<string, LinkImpl>();
    public get linkMap() : Map<string, Link>{
        return this.linkMapImpl;
    }

    private topLevelLinksImpl : LinkImpl[] = [];
    public get topLevelLinks() : Link[]{
        return this.topLevelLinksImpl;
    }

    private legend = document.querySelector(".legend") as HTMLElement;
    private legendPullOut = document.querySelector(".legend-tab-out") as HTMLElement;
    private legendPullIn = document.querySelector(".legend-tab-in") as HTMLElement;

    private readonly homePageLink: LinkImpl | null = null;
    private selectedLink: LinkImpl | null = null;

    private pageManager: PageManager;

    constructor(pageManager: PageManager){
        this.pageManager = pageManager;
        this.createLinks();
        
        /**Set the 'home' page which will act as the page to go to when closing pages. */
        if (pageManager.root.defaultChild !== null){
            let homePageLink = this.linkMapImpl.get(pageManager.root.defaultChild.pageRef);
            this.homePageLink = homePageLink === undefined ? null : homePageLink;
            this.selectedLink = this.homePageLink;
        }

        //Add behavior where if you click on the legend or pullout tab, it stops the event from bubbling up. This allows for clicking on anything but the legend to close the legend.
        this.legend.addEventListener("click", function(e: MouseEvent) {
            e.stopPropagation();
        });
        this.legendPullOut.addEventListener("click", function(e: MouseEvent) {
            e.stopPropagation();
        });

        //Add behavior where if you click outside of the legend, the legend closes.
        document.body.addEventListener("click", function(this: Legend, e: MouseEvent) {
            this.legend.classList.add("legend-collapsed");
        }.bind(this));

        //Add behavior where if you click the pull in tab, the legend closes.
        this.legendPullIn.addEventListener("click", function(this: Legend, e: MouseEvent) {
            this.legend.classList.add("legend-collapsed");
        }.bind(this));

        //Add behavior where if you click the pullout tab, the legend opens.
        this.legendPullOut.addEventListener("click", function(this: Legend, e: MouseEvent) {
            this.legend.classList.remove("legend-collapsed");
        }.bind(this));

        //Set the action taken when clicking on links. The link's page will be set to active unless the page is already 
        //active and the page is a top-level page, in which case the home page opens.
        this.linkMapImpl.forEach(function(this: Legend, link){
            if (link !== null && link.element !== null){
                link.element.addEventListener(
                    "click", 
                    () => {
                        let goToDefaultPage = link === this.selectedLink && link.parent === null;
                        let linkSelected = goToDefaultPage && this.homePageLink !== null ? this.homePageLink : link;
                        this.linkClicked(linkSelected, true);
                    }
                );
            }
        }, this);

        //Set the height of the legend to the inner height of the window. This is needed as 100vh is broken
        //on mobile due to the address bar taking up screen space but vh ignoring that.
        onWindowResize.add(() =>{
            this.legend.style.height = `${window.innerHeight}px`;
        });
        this.legend.style.height = `${window.innerHeight}px`;
    }

    private createLinks(){
        let legend = document.querySelector<HTMLElement>(".legend");
        if (legend === null){
            console.error("no element with class 'legend' was found in the document");
            return;
        }
        let elements = legend.querySelectorAll<HTMLElement>(".page-link");

        //Create a link for each page-link element in the legend element
        elements.forEach((element) => {
            let pageRef = element.getAttribute("pageRef");
            if (pageRef === null){
                console.error(`A page-link exists without a pageRef attribute.\n\telement=${element}`);
            }
            else if (this.linkMapImpl.has(pageRef)){
                console.error(`A page-link with the same pageRef already exists.\n\tpageRef=${pageRef}`);
            }
            else{
                let newLink = new LinkImpl(pageRef, element, this.pageManager);
                this.linkMapImpl.set(pageRef, newLink);

                //Setup parent/topLevelLinks - if there is a parent it must be placed prior to it's children in HTML
                let parent = this.getParent(newLink.element);
                if(parent === null){
                    this.topLevelLinks.push(newLink);
                }
                else{
                    let parentLink = this.linkMapImpl.get(parent);
                    if (parentLink !== undefined){
                        parentLink.children.push(newLink);
                        newLink.parent = parentLink;
                    }
                    else{
                        console.error(`A page-link (pageRef=${pageRef}) has a parent link (pageRef=${parent}), but no element was found with that pageRef. Note that parent's MUST be placed before children in HTML.`);
                    }
                }
            }
        });
    }

    /**
     * Returns the pageRef of the parent page-link or null if there is none
     */
    private getParent(element: Element){
        if (element.parentElement !== null){
            if (element.parentElement.classList.contains("sub-page-links")){
                let pageRef = element.parentElement.getAttribute("pageRef");
                if (pageRef === null){
                    console.error(`A link was found within a sub-page-links container, but that container doesn't have a pageRef attribute indicate their parent.`);
                }
                return pageRef;
            }
        }
        return null;
    }

    private linkClicked(link: LinkImpl, animateSwap: boolean = false){
        if (this.pageManager !== null){
            this.selectedLink = link;
            this.pageManager.selectPage(link.pageRef, animateSwap);
            this.legend.classList.add("legend-collapsed");
        }
    }
}