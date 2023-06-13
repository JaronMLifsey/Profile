import { ElementDragger, DragRestrictionDirection, DragRestrictionUnmovable } from "../Lib/Input/ElementDragger";
import { SlowDown, MoveToIf } from "../Lib/Input/DragEffect";
import { InputPointManager, InputPoint, InputPointType } from "../Lib/Input/InputPoint";
import * as _2D from "../Lib/Math/2D";
import { onWindowResize } from "../Lib/Util/Events";
import { clampValue } from "../Lib/Math/Util";
import { getPercent, linear } from "../Lib/Animation/Interpolate";
import { Page } from "../PageManager/Page";
import { PageAddon, PageManager } from "../PageManager/PageManager";


//Note: this code uses the concept of 'drag space' and 'screen space'.
//In 'drag space', items are layed out one next to the other with 0 starting at the center of the first element.
//They are layed out with their actual screen space dimensions so that dragging is 1-to-1 for the selected image
//(the selected image has 100% scaling so is full sized).Dragging the carousel elements is mathematically performed 
//in this 'drag space' - the space between the centers of the first and last element - and then mapped to screen
//space, i.e., their actual location. This is done by translating them from their normal positions at the top left
//of the parent container to the middle of the container plus it's left/right position to the current drag point
//and any scaling applied to it.

const unselectedScaleMax = 0.66;
const unselectedScaleMin = 0.33;
class Item{
    readonly element: HTMLElement;
    readonly pageRef: string;

    /**The center point of this item in drag space.*/
    public get dragSpaceCenter(): number{
        return (this.dragSpaceLeft + this.dragSpaceRight) * 0.5;
    }
    /**Where this item starts in drag space.*/
    public dragSpaceLeft: number = 0;
    /**Where this item ends in drag space. */
    public dragSpaceRight: number = 0;

    public get screenSpaceWidth(){
        return this.element.offsetWidth;
    }
    public get halfScreenSpaceWidth(){
        return this.element.offsetWidth * 0.5;
    }
    public get screenSpaceHeight(){
        return this.element.offsetHeight;
    }

    /**
     * @throws string if there is no pageRef attribute on the supplied element
     */
    constructor(element: HTMLElement){
        this.element = element;
        let ref = element.getAttribute("pageRef");
        if (ref === null){
            throw "There is no pageRef attribute on element " + element;
        }
        this.pageRef = ref;

    }
}
class ItemsManager{
    public readonly items: Item[];
    private widestItemWidthImpl: number = 0;
    public get widestItemWidth(){
        return this.widestItemWidthImpl;
    }
    private tallestItemHeightImpl: number = 0;
    public get tallestItemHeight(){
        return this.tallestItemHeightImpl;
    }
    private dragSpaceWidthImpl: number = 0;
    public get dragSpaceWidth(){
        return this.dragSpaceWidthImpl;
    }
    private itemDragWidthImpl: number = 0;
    /**How large each item is in drag space (except the first and last which are half as wide). */
    public get itemDragWidth(){
        return this.itemDragWidthImpl;
    }
    constructor(items: Item[]){
        this.items = items;
    }

    /**Should be called whenever the actual HTML elements change size or on initialization. */
    public update(){
        if (this.items.length === 0){
            return;
        }

        this.widestItemWidthImpl = 0;
        this.tallestItemHeightImpl = 0;

        let start = - this.items[0].screenSpaceWidth / 2;
        this.items.forEach((item) => {
            this.widestItemWidthImpl = Math.max(this.widestItemWidthImpl, item.screenSpaceWidth);
            this.tallestItemHeightImpl = Math.max(this.tallestItemHeightImpl, item.screenSpaceHeight);
            start += item.screenSpaceWidth;
        }, this);
        this.dragSpaceWidthImpl = start - this.items[this.items.length - 1].screenSpaceWidth / 2;

        this.itemDragWidthImpl = this.dragSpaceWidthImpl / (this.items.length - 1);
        let halfAverageWidth = this.itemDragWidthImpl / 2;
        for (let i = 0; i < this.items.length; i++){
            let item = this.items[i];
            item.dragSpaceLeft = i * this.itemDragWidthImpl - halfAverageWidth;
            item.dragSpaceRight = i * this.itemDragWidthImpl + halfAverageWidth;
        }
    }

    /**Returns the indices of the items left and right of center and how close to the right item center is. */
    public getCenterItemData(dragCenter: number) : DragCenterData{
        //break drag space up into segments half the size of the full item widths (left/right most items are 
        //half as wide in drag space since they can't get dragged past the center on their left/right side).
        //    |start      drag space       end|
        //|   :---|---:---|---:---|---:---|---:   |
        //      0   1   2   3   4   5   6   7        <= itemDragSegmentIndex
        //    0       1       2       3       4      <= item index

        //Determine which half of which item the dragCenter is in
        let halfItemDragWidth = this.itemDragWidthImpl * 0.5;
        let itemDragSegmentIndex = clampValue(Math.trunc(dragCenter / halfItemDragWidth), 0, this.items.length * 2 - 3);
        let centerIsOnLeftSegment = itemDragSegmentIndex % 2 === 1;
        let centerIndex = Math.trunc((itemDragSegmentIndex + 1) / 2);

        return {
            itemLeftOfDragCenterIndex: centerIsOnLeftSegment ? centerIndex - 1: centerIndex,
            dragCenterPercentToRightItem: (dragCenter - itemDragSegmentIndex * halfItemDragWidth) / this.itemDragWidth + (centerIsOnLeftSegment ? 0.5 : 0)
        }
    }
}

enum Origin{
    TopRight,
    BottomRight,
    TopLeft,
    BottomLeft,
    TopMiddle,
    BottomMiddle
}
class ItemTargetPoint{
    public screenOffset: _2D.Vector = [0, 0];
    public scale: number = 0;
    public origin: Origin = Origin.TopMiddle;
    public zIndex: number = 0;

    /**Returns the offset that should be applied to the specified item to position it to this target point with this point's scale also applied. */
    public getScaledOffset(item: Item): _2D.Vector{
        let itemSize: _2D.Vector = [item.screenSpaceWidth, item.screenSpaceHeight];
        switch(this.origin){
            case Origin.TopRight:{
                let scaledSize = _2D.mul1(itemSize, this.scale);
                let halfScaledDifference = _2D.mul1(_2D.sub(itemSize, scaledSize), 0.5);
                return [halfScaledDifference[0] - itemSize[0] + this.screenOffset[0], this.screenOffset[1] - halfScaledDifference[1]];
            }
            case Origin.BottomRight:{
                let scaledSize = _2D.mul1(itemSize, this.scale);
                let halfScaledDifference = _2D.mul1(_2D.sub(itemSize, scaledSize), 0.5);
                return _2D.add(_2D.sub(halfScaledDifference, itemSize), this.screenOffset);
            }
            case Origin.TopLeft:{
                let scaledSize = _2D.mul1(itemSize, this.scale);
                let halfScaledDifference = _2D.mul1(_2D.sub(itemSize, scaledSize), 0.5);
                return _2D.sub(this.screenOffset, halfScaledDifference);
            }
            case Origin.BottomLeft:{
                let scaledSize = _2D.mul1(itemSize, this.scale);
                let halfScaledDifference = _2D.mul1(_2D.sub(itemSize, scaledSize), 0.5);
                return [this.screenOffset[0] - halfScaledDifference[0], halfScaledDifference[1] - itemSize[1] + this.screenOffset[1]];
            }
            case Origin.TopMiddle:{
                let halfItemSizeX = itemSize[0] * 0.5;
                let halfScaledDifferenceY = (itemSize[1] - itemSize[1] * this.scale) * 0.5;
                return _2D.sub(this.screenOffset, [halfItemSizeX, halfScaledDifferenceY]);
            }
            case Origin.BottomMiddle:{
                let halfItemSizeX = itemSize[0] * 0.5;
                let halfScaledDifferenceY = (itemSize[1] - itemSize[1] * this.scale) * 0.5;
                return _2D.sub(this.screenOffset, [halfItemSizeX, itemSize[1] - halfScaledDifferenceY]);
            }
        }
    }
}
type DragCenterData = {
    /**The index of the item which is left of center (or on center). */
    itemLeftOfDragCenterIndex: number,
    /**A number in range [0, 1] where 0 indicates that the drag center is on the item at leftOfCenterItemIndex
     * and 1 indicating it is on the item at index leftOfCenterItemIndex + 1.*/
    dragCenterPercentToRightItem: number,
};
class RegionManager{
    private readonly container: HTMLElement;
    private readonly itemManager: ItemsManager;
    private readonly invertY: boolean;
    private readonly regionTargetPoints : ItemTargetPoint[];

    private readonly centerRegionIndexImpl: number;
    /**The index of the region directly in the center - where the currently selected item should go. */
    public get centerRegionIndex(){
        return this.centerRegionIndexImpl;
    }

    constructor(container: HTMLElement, itemManager: ItemsManager, invertY: boolean){
        this.container = container;
        this.itemManager = itemManager;
        this.invertY = invertY;

        this.regionTargetPoints = new Array<ItemTargetPoint>(itemManager.items.length * 2 - 1);
        this.centerRegionIndexImpl = itemManager.items.length - 1;
        let maxScale = itemManager.items.length <= 2;
        for (let i = 0; i < this.regionTargetPoints.length; i ++){
            let targetPoint = new ItemTargetPoint();
            this.regionTargetPoints[i] = targetPoint;
            if (i < this.centerRegionIndexImpl){
                targetPoint.origin = invertY ? Origin.TopRight : Origin.BottomRight;
                targetPoint.scale = maxScale ? unselectedScaleMax : linear(unselectedScaleMin, unselectedScaleMax, getPercent(0, this.centerRegionIndex - 1, i));
                targetPoint.zIndex = i;
            }
            else if (i === this.centerRegionIndexImpl){
                targetPoint.origin = invertY ? Origin.BottomMiddle : Origin.TopMiddle;
                targetPoint.scale = 1;
                targetPoint.zIndex = i;
            }
            else{
                targetPoint.origin = invertY ? Origin.TopLeft : Origin.BottomLeft;
                targetPoint.scale = maxScale ? unselectedScaleMax : linear(unselectedScaleMax, unselectedScaleMin, getPercent(itemManager.items.length, this.regionTargetPoints.length - 1, i));
                targetPoint.zIndex = this.regionTargetPoints.length - 1 - i;
            }
        }
    }

    public generateRegionTargetPoints(centerWidth: number, invertY: boolean){
        //If invertY is false, the center component will be positioned at the bottom and the left/right ones will go up
        //If invertY is true, the center component will be positioned at the top and the left/right ones will go down

        //Calculate the left region and then the right by reflection the left.

        //Calculate the left region ------------------------------------------------
        let containerSize: _2D.Vector = [this.container.clientWidth, this.container.clientHeight];
        let containerCenter = _2D.mul(containerSize, [.5, .5]);

        //Determine y range
        let maxScaledHeight = this.itemManager.tallestItemHeight * unselectedScaleMax;
        let yAvailableRange = this.container.clientHeight - maxScaledHeight;
        let ySegmentCount = Math.max(this.itemManager.items.length - 1, 2);//one above each element plus an extra for the very bottom less the center selected item.
        let ySegmentSize = yAvailableRange / ySegmentCount;

        //Determine x range
        let halfCenterWidth = centerWidth * 0.5;
        let xAvailableRange = containerCenter[0] - halfCenterWidth;
        let xSegmentCount = this.itemManager.items.length - 1;//one per item plus the left most slot to remain empty (that one would always be nearly totally offscreen) less the center selected item.
        let xSegmentSize = xAvailableRange / xSegmentCount;

        //Determine bounds
        let sideRegionStart: _2D.Vector = [xSegmentSize, containerSize[1]];//Bottom left
        let sideRegionEnd: _2D.Vector = [containerCenter[0] - halfCenterWidth, maxScaledHeight + ySegmentSize];//Top right

        //Interpolate between bound corners for each item (items are positioned onto these points based on their bottom right corner)
        if (this.itemManager.items.length <= 2){
            this.regionTargetPoints[0].screenOffset = sideRegionEnd;
        }
        else{
            /**Regions will be positioned from on their bottom right corner along the bottom-left to top-right available space, but not linearly.
             * They will be positioned on the path with a distance proportional to the scale of the previous region.*/
            let totalScale = 0;
            for (let i = 0; i < this.itemManager.items.length - 2; i ++){//Don't include scale of last region, it's not needed.
                totalScale += this.regionTargetPoints[i].scale;
            }
            let runningScaleSum = 0;
            for (let i = 0; i < this.itemManager.items.length - 1; i ++){
                this.regionTargetPoints[i].screenOffset = _2D.lerp(sideRegionStart, sideRegionEnd, runningScaleSum / totalScale);
                runningScaleSum += this.regionTargetPoints[i].scale;
            }
        }
        //Calculate the center region ------------------------------------------------
        this.regionTargetPoints[this.itemManager.items.length - 1].screenOffset = [containerCenter[0], 0];

        //Calculate the right region ------------------------------------------------
        //Set the right by reflecting the left over the y axis at the center
        for (let leftI = 0, rightI = this.regionTargetPoints.length - 1; rightI > this.centerRegionIndex; leftI ++, rightI --){
            this.regionTargetPoints[rightI].screenOffset[1] = this.regionTargetPoints[leftI].screenOffset[1];
            this.regionTargetPoints[rightI].screenOffset[0] = containerSize[0] - this.regionTargetPoints[leftI].screenOffset[0];
        }

        //Flip over the x axis at container center if invertY is true
        if (this.invertY){
            for (let pt of this.regionTargetPoints){
                pt.screenOffset[1] = containerSize[1] - pt.screenOffset[1];
            }
        }

        return this.regionTargetPoints;
    }
}
class LayoutHandler{
    private readonly items: Item[] = [];
    public readonly invertY: boolean;

    /**totalWidth - half of the first and last items. */
    public get dragSpaceWidth(){
        return this.itemManager.dragSpaceWidth;
    }

    private itemManager: ItemsManager;
    private regionManager: RegionManager;

    constructor(carousel: Carousel, invertY: boolean){
        this.items = carousel.items;
        this.invertY = invertY;

        this.itemManager = new ItemsManager(carousel.items);
        this.regionManager = new RegionManager(carousel.itemContainer, this.itemManager, invertY);
    }

    private calcCenterRegionScreenWidth(centerData: DragCenterData){
        return linear(this.items[centerData.itemLeftOfDragCenterIndex].screenSpaceWidth, this.items[centerData.itemLeftOfDragCenterIndex + 1].screenSpaceWidth, centerData.dragCenterPercentToRightItem);
    }
    public setDragCenter(dragCenter: number){
        let centerData = this.itemManager.getCenterItemData(dragCenter);
        let centerWidth = this.calcCenterRegionScreenWidth(centerData);
        let regions = this.regionManager.generateRegionTargetPoints(centerWidth, this.invertY);

        /**Position all items. This is done by interpolating the items position between where it would be if
         * it occupied the region to its left and to its right according to the how close the 'drag center'
         * is to the item to the drag center's left. */
        for (let i = 0; i < this.items.length; i ++){
            /** */
            let leftRegionIndex = this.regionManager.centerRegionIndex - 1 + i - centerData.itemLeftOfDragCenterIndex;
            let rightRegionIndex = leftRegionIndex + 1;
            let leftRegion = regions[leftRegionIndex];
            let rightRegion = regions[rightRegionIndex];

            let item = this.items[i];
            /**Interpolation is done in opposite direction since the percentToRight is from the drag center's perspective. 
             * If the center is near the item to its right, then that right item is nearer it's left region than it's right region.*/
            let finalScale = linear(rightRegion.scale, leftRegion.scale, centerData.dragCenterPercentToRightItem);
            let finalOffset = _2D.lerp(rightRegion.getScaledOffset(item), leftRegion.getScaledOffset(item), centerData.dragCenterPercentToRightItem);

            item.element.style.transform = `translate(${finalOffset[0]}px, ${finalOffset[1]}px) scale(${finalScale})`;
            item.element.style.zIndex = leftRegion.zIndex.toString();
        }
    }
    /**Should be called when the screen is resized and the first time the page is displayed.*/
    public updateLayout(){
        this.itemManager.update();
    }
}

export class Carousel{
    public readonly carouselElement: HTMLElement;
    public readonly itemContainer: HTMLElement;

    public readonly items: Item[] = [];

    // private readonly leftArrow: HTMLElement;
    // private readonly rightArrow: HTMLElement;

    // private readonly dotHandler: SelectedDotHandler;
    private readonly layoutHandler: LayoutHandler;
    private readonly pageManager: PageManager;
    private readonly parent: Page;

    /**Indicates if the carousel should move when a page is selected. This is needed to turn off this
     * behavior when the layout is updated and the currently selected item is teleported to. */
    // private shouldMoveOnPageSelected = true;

    private selectedItemIndex: number;

    private inputHandler: InputPointManager;

    private dragHandler: ElementDragger;

    constructor(element: HTMLElement, parent: Page, pageManager: PageManager){
        this.carouselElement = element;
        this.parent = parent;
        this.pageManager = pageManager;

        this.itemContainer = document.createElement("div");
        this.itemContainer.classList.add("item-container");
        element.append(this.itemContainer);

        let itemElements: NodeListOf<HTMLElement> = element.querySelectorAll(".carousel-item");

        if (itemElements.length < 2){
            throw new Error(`Fatal error occurred while creating a carousel: there must be at least two carousel-item elements 
            within the carousel, but there's only ${itemElements.length}. Carousel element was ${element}`);
        }

        let selectedIndex: number | null = null;
        for (let i = 0; i < itemElements.length; i ++){
            let itemElement = itemElements[i];
            this.itemContainer.append(itemElement);
            //Create a new item and add it ot the map if there is no duplicate pageRef
            let item = new Item(itemElement);
            this.items.push(item);
            
            //Move the carousel to the correct item when a page is selected.
            let page = pageManager.pageNodes.get(item.pageRef);
            if (page !== undefined){
                page.onSelected.add(this.wasSelected.bind(this, i));
                if (page.isSelectedChild){
                    selectedIndex = i;
                }
            }

            //Setup the on click behavior of the carousel
            let inputManager = new InputPointManager(item.element, {trackMoveEvents: true});
            inputManager.defaultPointBehavior.onClick.add(
                function(this: Carousel, index: number, pt: InputPoint, event: Event){
                    if (pt.type === InputPointType.TOUCH || (event as MouseEvent).button === 0){
                        this.pageManager.selectPage(this.items[index].pageRef, true);
                        this.wasSelected(index);
                    }
                }.bind(this, i)
            );

            /**Make it so that an item can't be selected if it's being dragged.
             * This is done by using the same dragThreshold as is used below on the container element
             * and making dragging disable clicks.*/
            inputManager.defaultPointBehavior.draggingAllowed = true;
            inputManager.defaultPointBehavior.draggingDisablesClicks = true;
            inputManager.defaultPointBehavior.dragThreshold = [10, 10];
        }

        this.layoutHandler = new LayoutHandler(this, this.carouselElement.hasAttribute("invert-y"));

        if (selectedIndex !== null){
            this.selectedItemIndex = selectedIndex;
        }
        else{
            this.selectedItemIndex = 0;
            console.warn(`No carousel item was initially selected.`);
        }
        this.items[this.selectedItemIndex].element.classList.add("selected");

        //Setup the dragging for the carousel
        this.inputHandler = new InputPointManager(this.itemContainer, {trackMoveEvents: true});
        this.inputHandler.defaultPointBehavior.dragThreshold = [10, 10];
        this.inputHandler.defaultMouseBehavior.onDrag.add((pt, e) => {
            e.preventDefault();//Don't highlight stuff when dragging
        });
        this.dragHandler = new ElementDragger(this.itemContainer);
        this.dragHandler.postDragBehavior = new MoveToIf(new SlowDown(), this.getNearestCenter.bind(this));
        this.dragHandler.onNewPosition = this.updateItemPositions.bind(this);
        this.dragHandler.watch(this.inputHandler.defaultPointBehavior);

        //Set initial layout
        if (parent.isVisible){
            this.layoutItems();
        }
        
        //Need to layout the carousel items anytime the screen size changes, but only if the page is visible
        onWindowResize.add(() => {
            if (parent.isVisible){
                this.layoutItems();
            }
        });

        //Need to layout the carousel items anytime the parent page is made visible.
        parent.onMadeVisible.add(this.layoutItems.bind(this));
    }

    private setSelectedClass(newItem: number, oldItem: number){
        this.items[oldItem].element.classList.remove("selected");
        this.items[newItem].element.classList.add("selected");
    }
    private wasSelected(index: number){
        if (this.selectedItemIndex !== index){
            if (this.parent.isVisible){
                this.moveToItem(this.items[index]);
            }
            this.setSelectedClass(index, this.selectedItemIndex);
            this.selectedItemIndex = index;
        }
    }
    private selectItem(index: number){
        if (this.selectedItemIndex !== index){
            this.setSelectedClass(index, this.selectedItemIndex);
            this.selectedItemIndex = index;
            this.pageManager.selectPage(this.items[index].pageRef, true);
        }
    }
    
    private getItemIndexAt(pt: number){
        for (let i = 0; i < this.items.length; i ++){
            if (this.items[i].dragSpaceRight > pt){
                return i;
            }
        }
        return this.items.length - 1;
    }

    /**Used by the MoveToIf drag effect which uses a callback to get the final destination. This is called whenever dragging stops.*/
    private getNearestCenter(endPt: _2D.Vector): _2D.Vector{
        //Invert the values since dragging is done from 0 down due to the need for the drag value to go down (-) when mouse moves right (+)
        let index = this.getItemIndexAt(- endPt[0])
        this.selectItem(index);
        return [-this.items[index].dragSpaceCenter, 0];
    }

    private updateItemPositions(element: HTMLElement, dragPt: _2D.Vector){
        this.layoutHandler.setDragCenter(-dragPt[0]);//invert it again so that the center point moves to the right
    }

    private layoutItems(){
        this.layoutHandler.updateLayout()
        /**The dragging is negative to reverse the direction of dragging so dragging to the left (negative) makes the 
         * 'center point' move to the right (since the carousel animates based on the 'center point' which is to be displayed.)
         */
        this.dragHandler.dragRestriction = new DragRestrictionDirection([-this.layoutHandler.dragSpaceWidth, 0]);

        this.moveToItem(this.items[this.selectedItemIndex], true);
    }

    private moveToItem(item: Item, teleport = false){
        // this.shouldMoveOnPageSelected = !teleport;
        this.dragHandler.moveTo([-item.dragSpaceCenter, 0], teleport ? 0 : 500);
    }
}

class CarouselAddon implements PageAddon{
    registered(pageManager: PageManager): void {}
    /**
     * Creates carousels for the specified page if any carousels exists in the HTML for that page.
     */
    pageCreated(page: Page, pageManager: PageManager): void {
        let carouselElement: NodeListOf<HTMLElement> = page.element.querySelectorAll(".carousel");
        let carousels: Carousel[] = [];
        carouselElement.forEach(function(element){
            try{
                carousels.push(new Carousel(element, page, pageManager));
            }
            catch (e){
                console.error(e);
            }
        });
    }
    public get name(): string{
        return "Carousel";
    }
}
export const carouselAddon = new CarouselAddon();