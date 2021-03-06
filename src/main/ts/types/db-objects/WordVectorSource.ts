import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class WordVectorSource extends DBObject<WordVectorSource> {
    readonly resource: ResourceURL;
    readonly label: string;
    getInsertParams(): any[] {
        return [this.resource.getID(), this.label];
    }
    table(): string {
        return "WordVectorSource";
    }
    insertCols(): string[] {
        return ["resource", "label"];
    }
    idCol() {
        return "resource"
    }
    getDeps() {
        return [this.resource];
    }
    static DEFAULT = new WordVectorSource({
        label: "fasttext_crawl-300d-2M",
        resource: new ResourceURL("https://dl.fbaipublicfiles.com/fasttext/vectors-english/crawl-300d-2M.vec.zip"),
    });
}
