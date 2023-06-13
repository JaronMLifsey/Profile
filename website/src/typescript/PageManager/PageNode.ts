import { log, LogCategory, logError, logWarn } from "../Lib/Debug/Debugging";
import { EventDispatcher } from "../Lib/Util/EventDispatcher";
import { httpRequestAsync, TaskSingleton, TaskState, TypedKeysOf } from "../Lib/Util/JsUtil";
import { Page, PageImpl } from "./Page";
import { PageManager } from "./PageManager";

//Display loaded content offscreen so any images will load.
let offscreenWaitingArea = document.createElement("div");
// offscreenWaitingArea.style.transform = "translate(200%)";
offscreenWaitingArea.style.width = "100%";
offscreenWaitingArea.style.position = "absolute";
document.body.appendChild(offscreenWaitingArea);

type PageNodeEventDispatcher = EventDispatcher<[PageNode], (node: PageNode) => void>;
export interface PageNode{
    /**A unique string identifier for this page.*/
    readonly pageRef: string;
    /**The parent of this node. */
    readonly parent: PageNode | null;
    /**The position of this node relative to its siblings. */
    readonly siblingOrder: number;
    
    //A list of children in order.
    readonly children: PageNode[];

    //The default child of this node or null if it has no children.
    readonly defaultChild: PageNode | null;

    /**The page owned by this node. */
    readonly page: Page | null;

    /**The child which is currently selected or null if this node has no children. */
    readonly selectedChild: PageNode | null;

    /**Called when this node changes from being in the currently selected path to not being in the currently selected path.
     * NOTE: the owned page might not even exist when this occurs (in which case it'll start loading).*/
    readonly onPathDeselected: PageNodeEventDispatcher;
    /**Called when this node changes from not being in the currently selected path to being in the currently selected path.
     * NOTE: the owned page might not even exist when this node is deselected (it might still be loading in).*/
    readonly onPathSelected: PageNodeEventDispatcher;

    /**Called when this node is selected.
     * NOTE: This is not called when an ancestor is selected, only when this node is.
     * NOTE: the owned page might not even exist when this node is selected (in which case it'll start loading).*/
    readonly onSelected: PageNodeEventDispatcher;
    /**Called when this node is deselected.
     * NOTE: This is not called when an ancestor is deselected, only when this node is.
     * NOTE: the owned page might not even exist when this node is deselected (it might still be loading in). */
    readonly onDeselected: PageNodeEventDispatcher;
    /**Called when the owned page is loaded.
     * NOTE: Child pages are not guaranteed to be loaded.*/
    readonly onPageLoaded: PageNodeEventDispatcher;

    /**
     * Returns true if this page is the selected child of it's parent.
     * NOTE: this can be true but inSelectedPath may still be false.
     */
    readonly isSelectedChild: boolean;

    /**Returns true if this page is contained in the currently selected path (from the root down to selectedLeaf). */
    readonly inSelectedPath: boolean;

    /**The hightest level ancestor node. */
    readonly root: PageNode;

    /**Returns the leaf pageNode of the selected path starting from this node (or 'this' if no children are selected / there are no children).
     * NOTE: calling this on a unselected node will still function, but it may return a node that is not actually selected (if it returns itself).*/
    readonly selectedLeaf: PageNode;

    readonly selectedPath: () => Generator<PageNode, void, unknown>;

    readonly title: string;
}

type TreeModificationList = {
    nodesDeselected: PageNodeImpl[],
    nodesSelected: PageNodeImpl[],
    nodesAddedToActivePath: PageNodeImpl[],
    nodesRemovedFromActivePath: PageNodeImpl[]
}
/**
 * This class manages an individual page which may or may not be loaded. The page itself will manage the HTML content.
 * PageNodes are a tree structure where each node can have any number of children. There must be a singular parent node
 * for the whole site (pageRef='root').
 */
export class PageNodeImpl implements PageNode{
    public readonly pageManager: PageManager;
    public readonly pageRef: string;
    public readonly parent: PageNodeImpl | null;
    public readonly siblingOrder: number;
    public readonly children: PageNodeImpl[] = [];
    public readonly title: string;

    /**The index of the tree layer where 0 is the root node. */
    public readonly level: number;

    /**A task which is responsible for loading the HTML of THIS page. NOTE: This task throws if the page could not be loaded.*/
    private loadPageElementTask: TaskSingleton<HTMLElement>;
    /**A task which is responsible for ensuring this and all parent pages are loaded.
     * The boolean returned indicates if the page succeeded in loading. NOTE: This task throws if any parent failed to load.*/
    private loadPageStackTask: TaskSingleton<void>;

    private pageImpl: PageImpl | null = null;
    /**The page which this node manages. If it is not loaded this will be null. */
    public get page(): PageImpl | null{
        return this.pageImpl;
    }

    private selectedChildImpl: PageNodeImpl | null = null;
    /**The currently selected child.*/
    public get selectedChild(){
        return this.selectedChildImpl;
    }

    /**Called when this node changes from not being in the currently selected path to being in the currently selected path.
     * NOTE: the owned page might not even exist when this node is deselected (it might still be loading in). */
    public readonly onPathSelected = new EventDispatcher<[PageNode], (node: PageNode) => void>();
    //TODO implement these and use onPathDeselected in VideoManager to pause videos
    /**Called when this node changes from being in the currently selected path to not being in the currently selected path.
     * NOTE: the owned page might not even exist when this occurs (in which case it'll start loading).*/
    public readonly onPathDeselected = new EventDispatcher<[PageNode], (node: PageNode) => void>();

    /**Called when this node is selected.
     * NOTE: the page might not even exist when this node is selected (in which case it'll start loading). */
    public readonly onSelected = new EventDispatcher<[PageNode], (node: PageNode) => void>();
    /**Called when this node is deselected.
     * NOTE: This is not called when a parent is deselected, only when this node is.
     * NOTE: the page might not even exist when this node is deselected (it might still be loading in). */
    public readonly onDeselected = new EventDispatcher<[PageNode], (node: PageNode) => void>();
    /**Called when the owned page is loaded and added to it's parent.
     * NOTE: Child pages are not guaranteed to be loaded.*/
    public readonly onPageLoaded = new EventDispatcher<[PageNode], (node: PageNode) => void>();


    public constructor(pageManager: PageManager, pageRef: string, title: string, parent: PageNodeImpl | null, siblingOrder: number){
        this.pageManager = pageManager;
        this.pageRef = pageRef;
        this.title = title;
        this.parent = parent;
        this.siblingOrder = siblingOrder;
        
        if (parent !== null){
            parent.children.push(this);
            //Initialize default paths
            if (parent.children.length === 1){
                parent.selectedChildImpl = this;
            }
        }

        this.level = this.calculateLevel();

        this.loadPageElementTask = new TaskSingleton(this.loadPageElement.bind(this));
        this.loadPageStackTask = new TaskSingleton(this.loadPageStack.bind(this));
    }
    
    public get defaultChild(): PageNodeImpl | null{
        return this.children.length > 0 ? this.children[0] : null;
    }
    
    /**Returns true if this node and all selected descendants are ready to be displayed.
     * Note that some pages may not have loaded and instead show an error message.*/
    public get readyToDisplay(){
        if (this.selectedChildImpl !== null){
            if (!this.selectedChildImpl.readyToDisplay){
                return false;
            }
        }
        return this.pageImpl !== null;
    }

    /**Returns true if this node and all selected descendants are loaded. If this returns true, readyToDisplay would as well.*/
    public get pathIsLoaded(){
        return this.selectedLeaf.loadPageStackTask.state === TaskState.Succeeded;
    }

    /**Returns true if this node or any selected descendants failed to loaded.*/
    public get pathFailedToLoad(){
        return this.selectedLeaf.loadPageStackTask.state === TaskState.Failed;
    }

    public get isSelectedChild(){
        if (this.parent === null){
            return true;
        }
        return this.parent.selectedChild === this;
    }

    public get inSelectedPath(): boolean{
        if (this.parent === null){
            return true;
        }
        return this.parent.selectedChild === this && this.parent.inSelectedPath;
    }

    /**Gets the top node of the tree this node is in. */
    public get root(): PageNodeImpl{
        if (this.parent !== null){
            return this.parent.root;
        }
        return this;
    }

    /**Returns the leaf pageNode in the selected path starting from this node (or 'this' if no children are active).
     * NOTE: the returned node will only the in the selected path if this node.inSelectedPath is also true (or this is called on the root node).*/
    public get selectedLeaf(): PageNodeImpl{
        if (this.selectedChildImpl !== null){
            return this.selectedChildImpl.selectedLeaf;
        }
        return this;
    }

    public get selectedPath(): () => Generator<PageNodeImpl, void, unknown>{
        return function*(this: PageNodeImpl) {
            let node: PageNodeImpl | null = this;
            while (node !== null){
                yield node;
                node = node.selectedChildImpl;
            }
        }.bind(this);
    }

    /**Call on ROOT ONLY - causes the current selected path to be presented. This should only be called if isLoaded returns true.*/
    public present(animate: boolean){
        this.page!.present(animate);//The page should always be loaded when this is called.
    }

    private dispatchToList(list: PageNodeImpl[], dispatcherName: TypedKeysOf<PageNodeImpl, PageNodeEventDispatcher>){
        for (let node of list){
            node[dispatcherName].dispatch(node);
        }
    }
    //Used during the selection process.
    private nextSelectedChild: PageNodeImpl | null = null;
    /**Sets the active path to go from the root to this node (child selections are not modified).
     * This does NOT load the pages in the active path; call ensurePathIsLoaded for that.*/
    public select(){
        if (this.inSelectedPath){//Also guarantees this isn't the root node as that's always selected.
            return;
        }
        //This is for delaying the events till the new path is fully built in case listeners need the new path.
        let treeModifications: TreeModificationList = {
            nodesDeselected: [],
            nodesSelected: [],
            nodesAddedToActivePath: [],
            nodesRemovedFromActivePath: []
        };

        let currentNode: PageNodeImpl | null = this;
        let nextSelectedChild: PageNodeImpl = this;
        while (currentNode.parent !== null){
            currentNode.parent.nextSelectedChild = nextSelectedChild;
            nextSelectedChild = currentNode.parent;
            currentNode = currentNode.parent;
        }

        //currentNode is now the root
        let currentNodeWasInSelectedPath = true;//Root is always selected

        while (currentNode !== null && currentNode.selectedChildImpl !== null){
            if (currentNode.nextSelectedChild === null){
                currentNode.nextSelectedChild = currentNode.selectedChildImpl;
            }

            if (currentNode.selectedChildImpl !== currentNode.nextSelectedChild){
                //Queue events
                if (currentNodeWasInSelectedPath){
                    /**If the current node was in the selected path, then its selected child
                     * must have been as well (and same for its child and so on). */
                    let node: PageNodeImpl | null = currentNode.selectedChildImpl;
                    while (node !== null){
                        treeModifications.nodesRemovedFromActivePath.push(node);
                        node = node.selectedChildImpl;
                    }
                }
                treeModifications.nodesDeselected.push(currentNode.selectedChildImpl);
                treeModifications.nodesSelected.push(currentNode.nextSelectedChild);
            }

            if (!currentNodeWasInSelectedPath || currentNode.selectedChildImpl !== currentNode.nextSelectedChild){
                treeModifications.nodesAddedToActivePath.push(currentNode.nextSelectedChild);
            }

            currentNodeWasInSelectedPath = currentNodeWasInSelectedPath && currentNode.selectedChildImpl === currentNode.nextSelectedChild;

            //Change selected of node
            currentNode.selectedChildImpl = currentNode.nextSelectedChild;
            currentNode.nextSelectedChild = null;
            currentNode = currentNode.selectedChildImpl;
        }

        
        //Dispatch all queued events (order is root to leaf).
        this.dispatchToList(treeModifications.nodesDeselected, 'onDeselected');
        this.dispatchToList(treeModifications.nodesRemovedFromActivePath, 'onPathDeselected');

        this.dispatchToList(treeModifications.nodesSelected, 'onSelected');
        this.dispatchToList(treeModifications.nodesAddedToActivePath, 'onPathSelected');
    }

    private async loadPageElement() {
        const url = document.location.origin + "/pages" + this.pageRef + ".html";
        try{
            let response = await httpRequestAsync(url, "GET");
            let pageElement = document.createElement("div");
            pageElement.innerHTML = response;
            return pageElement;
        }
        catch (reason){
            let error = new Error(`Attempted to load a page but no data was received from the server.\n\tURL = ${url}\n\tReason = ${reason}`);
            console.warn(error);
            throw error;
        }
    }
    
    /**
     * Loads the page (HTML) of this node, children in the selected path, and all ancestors.
     * There are three possible outcomes:
     *      (1) The pages load successfully and pathIsLoaded is true (and by extension readyToDisplay),
     *      (2) The pages fail to load, but are still able to create an error page - readyToDisplay is true, but pathFailedToLoad is true, and finally
     *      (3) The pages fail to load and cannot create an error page since there is no parent container in which to put it - readyToDisplay is false, and pathFailedToLoad is true.
     * NOTE: Throws an error in cases 2 and 3.
     */
    public ensurePathIsLoaded(){
        return this.selectedLeaf.ensureIsLoadedUpwards();
    }

    /**
     * Loads the page (HTML) of this node and all parent nodes that aren't yet loaded.
     * Throws an error if there was a problem loading the pages in which case it can still be displayed, it'll just show a error message.
     * NOTE: This MUST be called on a leaf node to guarantee the full selected path is loaded.
     */
    private ensureIsLoadedUpwards(){
        return this.loadPageStackTask.run(true);
    }

    private async loadPageStack(): Promise<void>{
        /**Always call parents as they may have failed to load last time while this one succeeded. */
        /**Start parents first so they can load while this one loads. */
        let parentProgress: Promise<void> | null = null;
        if (this.parent !== null){
            parentProgress = this.parent.ensureIsLoadedUpwards();
        }

        /**Get the loading of this page started before waiting for the parent to complete so they can run in parallel. */
        let futurePage = this.loadPageElementTask.run(true);

        if (parentProgress !== null){
            /**If this throws (parent page failed to load), nothing else needs to be done. This task will fail as well.*/
            await parentProgress;
        }

        let parentContainer = this.parent !== null ? this.parent.page!.childPageContainer : this.pageManager.rootContainer;
        if (parentContainer !== null){
            try{
                let loadedElement = await futurePage;//Can throw
                this.pageImpl = await this.createPage(parentContainer, loadedElement);
                this.onPageLoaded.dispatch(this);
            }
            catch(error: any){
                this.pageImpl = await this.createPage(parentContainer, this.getErrorPage(error));
                throw error;
            }
        }
        else{
            /**Nothing can be done to show an error to the user as there's no container to display it in.
             * Adding a website wide flasher could be a solution.
             * This scenario would only happen if there was a genuine bug in the HTML or handling of page creation.*/
            let error = new Error(`Failed to create the page for pageRef="${this.pageRef}" - The parent page has no element with class child-page-container.\nParent HTML:\n${this.parent?.page?.element.outerHTML}`);
            throw error;
        }
    }

    private getErrorPage(error: Error){
        let errorPage = document.createElement("div");
        errorPage.classList.add("page");

        errorPage.innerHTML = `
            <div class="page-msg-error">
                <h1>The page could not be loaded</h1>
                <p>The website may be down or an unexpected error may have occurred. Try reloading the page or returning later.</p>
                <expandable-div>
                    <p slot="button">Expand error</p>
                    <p>${error.message.replace(/\n/g, "<br>")}</p>
                </expandable-div>
            </div>
        `;

        return errorPage;
    }

    private async createPage(parentContainer: Element, pageElement: HTMLElement){
        if (this.pageImpl !== null){
            this.pageImpl.remove();
            this.pageImpl = null;
        }

        let page = new PageImpl(pageElement, this, this.getChildSwapFunction(), this.pageManager);
        await page.addToParent(parentContainer);
        return page;
    }

    /**Returns the index of the tree layer where 0 is the root node. */
    private calculateLevel(){
        let level = 0;
        let parent = this.parent;
        while (parent !== null){
            level ++;
            parent = parent.parent;
        }
        return level;
    }

    private getChildSwapFunction(){
        return this.pageManager.swapAnimations[Math.min(this.pageManager.swapAnimations.length - 1, this.level)];
    }
}