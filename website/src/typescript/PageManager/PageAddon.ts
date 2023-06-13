import { Page } from "./Page";


export interface PageAddon{
    pageCreated(page: Page): void;
}