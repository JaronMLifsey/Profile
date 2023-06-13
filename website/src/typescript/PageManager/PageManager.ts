import { LoadingSymbol } from "../Components/LoadingSymbol";
import { log, LogCategory, logError, logWarn } from "../Lib/Debug/Debugging";
import { EventDispatcher } from "../Lib/Util/EventDispatcher";
import { Page } from "./Page";
import { PageNodeImpl, PageNode } from "./PageNode";
import { SwapFunction } from "./PageSwapper";

//document.querySelector<HTMLElement>('.page[pageRef="/root"]');

declare const siteManifestJSON: string | undefined;
type ManifestObj = {pageRef: string, title:string, children: ManifestObj[]};

export interface PageAddon{
    pageCreated(page: Page, pageManager: PageManager): void;
    registered(pageManager: PageManager): void;
    readonly name: string;
}

export class PageManager{
    public readonly swapAnimations: SwapFunction[];
    public readonly pageNodes = new Map<string, PageNodeImpl>();
    private readonly loader = new LoadingSymbol();

    public readonly rootContainer: HTMLElement;

    /**Used by selectPage to determine if it's the most recent call after waiting for it's set page to load. */
    private selectPageCounter = 0;

    /**Called when a new node is selected. The inNode is the new node selected and the outNode is the one deselected.
     * Both nodes will share the same parent and may not be a leaf node.*/
    public readonly onNodeSelected = new EventDispatcher<[PageNode, PageNode, any], (inNode: PageNode, outNode: PageNode, source: any) => void>();

    private page_404Impl: PageNodeImpl | null = null;
    public get page_404(): PageNode | null{
        return this.page_404Impl;
    }
    private page_homeImpl: PageNodeImpl | null = null;
    public get page_home(): PageNode | null{
        return this.page_homeImpl;
    }

    private rootImpl: PageNodeImpl;
    public get root(): PageNode{
        return this.rootImpl;
    }

    public readonly addons = new Set<PageAddon>();

    /**
     * Creates a new PageManager. This will throw if the siteManifestJSON is not set to a valid JSON string with a root node.
     */
    constructor(swapAnimations: SwapFunction []){
        this.swapAnimations = swapAnimations;

        if (siteManifestJSON === undefined){
            throw `A variable named 'siteManifestJSON' must be declared in the global scope and it must be of the following format:
                {"/root": [
                    {"<childPageRef>": [<children>]},
                    {"<childPageRef>": [
                        {"<childChildPageRef>": []},
                    ]},
                    etc.
                ]}
            `;
        }

        let manifest = JSON.parse(siteManifestJSON) as ManifestObj;
        this.buildTree(null, manifest, 0);

        let root = this.pageNodes.get("/root");
        if (root === undefined){
            throw "Failed to create the PageManager - there is no /root node in the parsed siteManifestJSON.";
        }

        let rootContainer = document.querySelector<HTMLElement>(".site-pages-container");
        if (rootContainer === null){
            throw `Failed to create the PageManager - there is no element with class .site-pages-container.`;
        }
        this.rootContainer = rootContainer;

        this.rootImpl = root;
    }
    private buildTree(parent: PageNodeImpl | null, child: ManifestObj, order: number){
        if (!child.hasOwnProperty("pageRef") || !(typeof child.pageRef === 'string' || child.pageRef as any instanceof String) || 
            !child.hasOwnProperty("children") || !(child.children instanceof Array)
        ){
            console.error(`Failed to parse manifest JSON. Expected an object of this format:\n
            {pageRef: string, children: ManifestObj[]}\n
            but got the following instead:\n
            ${child}`);
            /**Just keep going anyways. Who knows, maybe it'll work somewhat... It's a pretty catastrophic error though,
             * but also one that only occurs if the manifest is malformed.*/
        }
        let newNode = new PageNodeImpl(this, child.pageRef, child.title, parent, order);
        this.pageNodes.set(child.pageRef, newNode);
        for (let i = 0; i < child.children.length; i ++){
            this.buildTree(newNode, child.children[i], i);
        }
    }

    /**Returns the two sibling nodes */
    private getLowestSiblings(inNode: PageNodeImpl, outNode: PageNodeImpl){
        while (inNode.level > outNode.level){
            inNode = inNode.parent!;
        }
        while (outNode.level > inNode.level){
            outNode = outNode.parent!;
        }
        while (true){
            if (inNode.parent === outNode.parent){
                return {inNode: inNode, outNode: outNode};
            }
            else{
                inNode = inNode.parent!;
                outNode = outNode.parent!;
            }
        }
    }

    /**
     * Sets the specified page to be active (displayed).
     * @param pageRef The identifier for the page.
     * @param animateSwap If true, the swap to the new page will be animated. If false, it will be instantaneous.
     * @param source Optional extra data passed to the onPageSet event
     */
    public async selectPage(pageRef: string, animateSwap: boolean, source: any = null): Promise<boolean>{

        this.selectPageCounter ++;
        let methodCallId = this.selectPageCounter;

        let node = this.pageNodes.get(pageRef);
        if (node === undefined){
            if (this.page_404Impl !== null){
                node = this.page_404Impl;
            }
            else{
                return Promise.resolve(false);
            }
        }

        if (!node.inSelectedPath){
            let previousSelectedLeaf = this.rootImpl.selectedLeaf;
            node.select();
            let swappedNodes = this.getLowestSiblings(node, previousSelectedLeaf);
            this.onNodeSelected.dispatch(swappedNodes.inNode, swappedNodes.outNode, source);
        }
        
        if (this.rootImpl.pathIsLoaded){
            this.rootImpl.present(animateSwap);
            this.loader.hide();
            return Promise.resolve(true);
        }
        else{
            try {
                this.loader.reveal();
                await node.ensurePathIsLoaded();
                return true;
            } catch (e) {
                return false;
            }
            finally{
                //Even if there was an exception, still attempt to present the pages since error pages may have been generated.

                /**Make sure that the invocation which started loading the newest selected path
                 * is the one that displays it, otherwise, data may not yet be in a correct state.*/
                if (methodCallId === this.selectPageCounter){
                    if (this.rootImpl.readyToDisplay){
                        /**If it's not ready, then a different call to selectPage was the one that
                         * selected the current path. That one will be finish this part off. */
                        this.loader.hide();
                        this.rootImpl.present(animateSwap);
                        if (!this.rootImpl.page!.isVisible){
                            this.rootImpl.page!.fadeIn();
                        }
                    }
                    else{
                        this.loader.hide();
                        //TODO - could add code for a error to display or something, but likely won't bother as this should be impossible.
                    }
                }
                //else, the selected path was changed after this call was made, but before the path could be loaded. The future call will handle displaying that new path.
            }
        }
    }

    public registerPageAddon(addon: PageAddon){
        if (this.addons.has(addon)){
            console.warn(`An addon is being added twice (this does nothing). Addon name: ${addon.name}`);
        }
        this.addons.add(addon);
    }

    public setHomePage(pageRef: string){
        let page = this.pageNodes.get(pageRef);
        if (page !== undefined){
            this.page_homeImpl = page;
            this.pageNodes.set("/", page);
        }
        else{
            console.error(`Page ${pageRef} was set as the home page, but there is no such page listed in the manifest.`);
        }
    }

    public set404Page(pageRef: string){
        let page = this.pageNodes.get(pageRef);
        if (page !== undefined){
            this.page_404Impl = page;
        }
        else{
            console.error(`Page ${pageRef} was set as the home page, but there is no such page listed in the manifest.`);
        }
    }
}