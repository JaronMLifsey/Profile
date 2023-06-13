interface CSSStyleDeclaration {
	[key:string]: any; // Add index signature
}

export function concatElementStates(...arrays : (State<any>[] | State<any>)[]){
	let states : State<any>[] = [];
	for (let i=0; i < arguments.length; i++) {
		if (Array.isArray(arguments[i])){
			states = states.concat(arguments[i]);
		}
		else{
			states.push(arguments[i]);
		}
	}
	return states;
}

export abstract class State<TargetType>{
	private alwaysSet: boolean;
	constructor(alwaysSet: boolean){
		this.alwaysSet = alwaysSet;
	}
	public abstract set(element: TargetType): void;
	public setIfRequired(element: TargetType): void{
		if (this.alwaysSet){
			this.set(element);
		}
	}
	public abstract restore(element: TargetType): void;

	static setAllStates<TargetType>(element: TargetType, states: State<TargetType>[]) {
		if (states) {
			states.forEach(function (state) {
				state.set(element);
			});
		}
	};
	static setAllRequiredStates<TargetType>(element: TargetType, states: State<TargetType>[]) {
		if (states) {
			states.forEach(function (state) {
				state.setIfRequired(element);
			});
		}
	};
	static restoreAllStates<TargetType>(element: TargetType, states: State<TargetType>[]) {
		if (states) {
			states.forEach(function (state) {
				state.restore(element);
			});
		}
	};
}

/**
 * Used to setup and restore initial conditions of objects. Used before an animation starts and after a reversed animation finishes reversing.
 * States can be set multiple times, and when restored, will restore the first value set. A restored state should not be restored again unless first set again.
 */
export abstract class ElementState<ValueType> extends State<HTMLElement>{
	private name: string;
	private value: ValueType;
	restoreValue: ValueType | null = null;

	/**
	 * @param alwaysSet If true and this is used as a post-state, this will be set when an animation cleans up pre-states after it finishes reversing.
	 */
	protected constructor (name: string, value: ValueType, alwaysSet: boolean) {
		super(alwaysSet);
		this.name = name;
		this.value = value;
	}
	public set(element: HTMLElement): void{
		if (this.restoreValue === null){
			this.restoreValue = this.internalSet(element, this.name, this.value);
		}
	}
	protected abstract internalSet(element: HTMLElement, name: string, value: ValueType): ValueType;
	public restore(element: HTMLElement): void{
		if (this.restoreValue !== null){
			this.internalRestore(element, this.name, this.restoreValue);
			this.restoreValue = null;
		}
	}
	protected abstract internalRestore(element: HTMLElement, name: string, value: ValueType): void;
}

// Used to set the states of the element being animated.
export class StyleState extends ElementState<string>{
	constructor (name: string, value: string, alwaysSet: boolean = false) {
		super(name, value, alwaysSet);
	}
	protected internalSet(element: HTMLElement, name: string, value: string): string {
		let current = (element.style as CSSStyleDeclaration)[name];
		(element.style as CSSStyleDeclaration)[name] = value;
		return current;
	}
	protected internalRestore(element: HTMLElement, name: string, value: string): void {
		(element.style as CSSStyleDeclaration)[name] = value;
	}
}

// Used to set the states of the parent elements of the element being animated.
export class ParentStyleState extends ElementState<string>{
	constructor (name: string, value: string, alwaysSet: boolean = false) {
		super(name, value, alwaysSet);
	}
	protected internalSet(element: HTMLElement, name: string, value: string): string {
		if (element.parentElement) {
			let current = (element.parentElement.style as CSSStyleDeclaration)[name];
			(element.parentElement.style as CSSStyleDeclaration)[name] = value;
			return current;
		}
		return "";
	};
	protected internalRestore(element: HTMLElement, name: string, value: string): void {
		if (element.parentElement) {
			(element.parentElement.style as CSSStyleDeclaration)[name] = value;
		}
	};
}

// Used to set the class states of the element being animated.
export class ClassState extends ElementState<boolean>{
	constructor (className: string, value: boolean, alwaysSet: boolean = false) {
		super(className, value, alwaysSet);
	}
	protected internalSet(element: HTMLElement, name: string, value: boolean): boolean {
		let current = element.classList.contains(name);
		if (value) {
			element.classList.add(name);
		}
		else {
			element.classList.remove(name);
		}
		return current;
	}
	protected internalRestore(element: HTMLElement, name: string, value: boolean): void {
		if (value) {
			element.classList.add(name);
		}
		else {
			element.classList.remove(name);
		}
	}
}
