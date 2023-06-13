/**A Double-ended queue who's access and modification functions have a amortized constant run time. */
export class Queue<T> implements Iterable<T>{
    /**The array to store the elements */
    private buffer: (T | undefined)[] = new Array(2);
    /**Index of first empty slot after queue ends */
    private afterLast: number = 1;
    /**Index of first empty slot before queue begins */
    private beforeFirst: number = 0;
    /**How many elements are currently stored in the queue */
    private count: number = 0;

    /**Returns an iterator which implements the Iterable interface */
    public [Symbol.iterator](): Iterator<T, any, undefined> {
        let i = this.iterate();
        return{
            next(): IteratorResult<T>{
                let result: IteratorResult<T>;
                let obj = i.next();
                if (obj === undefined){
                    result = {
                        done: true,
                        value: undefined
                    }
                }
                else{
                    result = {
                        done: false,
                        value: obj
                    }
                }

                return result;
            }
        }
    }

    /**Returns an iterator. */
    public iterate(){
        let i = this.nextIndex(this.beforeFirst);
        let remaining = this.count;
        return {
            /**returns the next element or undefined if there is none */
            next: (): T | undefined => {
                if (remaining <= 0){
                    return undefined;
                }
                let value = this.buffer[i];
                i = this.nextIndex(i);
                remaining --;
                return value;
            }
        };
    }
    
    private growIfNeeded(){
        if (this.count === this.buffer.length){
            let newBuffer = new Array(Math.ceil(this.buffer.length * 1.618 + 1));

            let iterator = this.iterate();
            let toIndex = 1;//could be 0 but then this.beforeFirst would have to be set to (array length - 1) which is fine, but i don't like it.
            for (let element = iterator.next(); element !== undefined; element = iterator.next()){
                newBuffer[toIndex ++] = element;
            }

            this.buffer = newBuffer;
            this.beforeFirst = 0;
            this.afterLast = toIndex;
        }
    }

    private nextIndex(i: number){
        i ++;
        if (i === this.buffer.length){
            i = 0;
        }
        return i;
    }
    private previousIndex(i: number){
        i --;
        if (i === -1){
            i = this.buffer.length - 1;
        }
        return i;
    }

    public get size(){
        return this.count;
    }

    public pushFront(obj: T){
        this.growIfNeeded();
        this.buffer[this.beforeFirst] = obj;
        this.beforeFirst = this.previousIndex(this.beforeFirst);
        this.count ++;
    }

    public peekFront(): T | undefined{
        if (this.count === 0){
            return undefined;
        }
        return this.buffer[this.nextIndex(this.beforeFirst)];
    }

    public popFront(): T | undefined{
        if (this.count === 0){
            return undefined;
        }
        let i = this.nextIndex(this.beforeFirst);
        let obj = this.buffer[i];
        this.buffer[i] = undefined;

        this.beforeFirst = i;
        this.count --;

        return obj;
    }
    
    public pushBack(obj: T){
        this.growIfNeeded();
        this.buffer[this.afterLast] = obj;
        this.afterLast = this.nextIndex(this.afterLast);
        this.count ++;
    }

    public peekBack(): T | undefined{
        if (this.count === 0){
            return undefined;
        }
        return this.buffer[this.previousIndex(this.afterLast)];
    }

    public popBack(): T | undefined{
        if (this.count === 0){
            return undefined;
        }
        let i = this.previousIndex(this.afterLast);
        let obj = this.buffer[i];
        this.buffer[i] = undefined;

        this.afterLast = i;
        this.count --;

        return obj;
    }
}