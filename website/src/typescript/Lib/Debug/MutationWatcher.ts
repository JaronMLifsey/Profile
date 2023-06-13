import { log, LogCategory } from "./Debugging";

var logging: boolean = false;

export function enableLogging(enable: boolean){
	logging = enable;
}

declare global {
	interface HTMLElement {
		name?: string;
		[key:string]: any; // Add index signature
	}
}

export class MutationWatcher{
	private element: HTMLElement;
	private attribute: string;
	private observer: MutationObserver;

	constructor(element: HTMLElement, attribute: string = "style"){
		this.element = element;
		this.attribute = attribute;

		this.observer = new MutationObserver(
			function(){
				return function(mutations: MutationRecord[]) {
					for (let i = 0; i < mutations.length; i ++){
						if (mutations[i].attributeName === attribute){
							let name = element.name === undefined? "unknown" : element.name;
							let newValue = element.getAttribute(attribute);
							log(LogCategory.Mutations, name + "." + attribute + " (" + mutations[i].oldValue + ") = " + newValue);
						}
					} 
				}
			}()
		);
	}

	start(){
		this.observer.observe(this.element, {
			attributes: true,
			attributeOldValue: true,
			attributeFilter: [this.attribute]
		});
	}
	stop(){
		this.observer.disconnect();
	}
}