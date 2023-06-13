/**Describes a class capable of handling several values. This is useful for averages or sums*/
export interface ValueHandler<T>{
    reset(): void;
    add(value: T): void;
    remove(value: T): void;
    getValue(): T;
}