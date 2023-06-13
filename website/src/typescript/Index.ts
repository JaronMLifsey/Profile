

import { Legend } from "./Components/Legend";

import * as jsLibs from "./JsLibs";//Don't remove, this instantiates the scrollbars
import "../styles/root.scss";
import { PageManager } from "./PageManager/PageManager";
import { swapFunctions } from "./Animations/PageSwapAnimations";
import { registerAllCustomElements } from "./CustomElements/Index";
import { registerAllPageAddons } from "./PageAddons/Index";
//import { enableDebugging, enabledLogCategories, LogCategory, LogLevel, setLogLevel} from "./Lib/Debug/Debugging";

function getPageRefFromURL() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	return urlParams.get('page') || "/";
}

window.addEventListener('load', function () {
	try{
		const pageManager: PageManager = new PageManager(swapFunctions);
		pageManager.setHomePage("/home");
		pageManager.set404Page("/page_not_found");
		
		registerAllPageAddons(pageManager);
		registerAllCustomElements(pageManager);

		const legend: Legend = new Legend(pageManager);
		
		let dontPushState = new Object();
		pageManager.onNodeSelected.add((inNode, outNode, source) => {
			if (source !== dontPushState){
				window.history.pushState("", "", `?page=${inNode.selectedLeaf.pageRef}`);
				document.title = inNode.selectedLeaf.title;
			}
		});
		pageManager.selectPage(getPageRefFromURL(), false, dontPushState);
		document.title = pageManager.root.selectedLeaf.title;
		window.onpopstate = function(this: WindowEventHandlers, event: PopStateEvent) {
			pageManager.selectPage(getPageRefFromURL(), true, dontPushState);
			document.title = pageManager.root.selectedLeaf.title;
		};

		//setLogLevel(LogLevel.Error);
		//enableDebugging();//TODO remove and all imports in project
		// setLogLevel(LogLevel.All);//TODO remove
		// enabledLogCategories.add(LogCategory.PageSwapping);//TODO remove
		// enabledLogCategories.add(LogCategory.PageSwappingAnim);//TODO remove
	}
	catch(error){
		console.error("A problem ocurred\n" + error);
	}
});