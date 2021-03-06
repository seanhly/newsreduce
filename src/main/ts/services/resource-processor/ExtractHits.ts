import { ResourceURL } from "types/db-objects/ResourceURL";
import { JSDOM } from "jsdom";
import { HitType, nodeToHitType } from "types/HitType";
import { VersionType } from "types/db-objects/VersionType";
import { WordHits } from "types/WordHits";
import { LinkHits } from "types/LinkHits";
import { getAnchorsWithHREF, htmlCollectionToArray } from "services/resource-processor/functions";
import { wordsFromNode } from "services/resource-processor/functions";
import { HTMLProcessor } from "./HTMLProcessor";

const INCLUDE_TAGS = [
    "TITLE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "FIGCAPTION",
    "STRONG",
    "B",
    "A",
    "EM",
    "I",
    "BLOCKQUOTE",
    "P",
    "META",
];

interface BlockData {
    hitType: HitType;
    items: string[];
};

export function getHits(dom: JSDOM) {
    HTMLProcessor.removeExcludedNodes(dom);
    const queryItems =
        htmlCollectionToArray(dom.window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    const blockWordData: BlockData[] = [];
    const linksData: [string, HitType][] = [];
    const truthyAnchors = getAnchorsWithHREF(dom);
    for (const anchor of truthyAnchors)
        linksData.push([anchor.href, nodeToHitType(anchor.parentElement)]);
    // Ensure no words are counted twice.
    for (const item of queryItems)
        item.parentNode.removeChild(item);
    let wordsOnPage = 0;
    for (const item of queryItems) {
        const hitType = nodeToHitType(item);
        const words = wordsFromNode(item, hitType);
        if (words && words.length) {
            blockWordData.push({ hitType, items: words });
            wordsOnPage += words.length;
        }
    }
    let n = 0;
    const wordHits = new WordHits();
    for (const block of blockWordData)
        for (const word of block.items)
            wordHits.register(word, n++, wordsOnPage, block.hitType);
    for (const word of wordHits.objects.values()) word.enqueueInsert({ recursive: true });
    n = 0;
    const linkHits = new LinkHits();
    for (const [url, hitType] of linksData)
        n = linkHits.register(url, n, linksData.length, hitType);
    for (const link of linkHits.objects.values()) link.enqueueInsert({ recursive: true });

    return { wordHits, linkHits };
}

export class ExtractHits extends HTMLProcessor {
    ro() { return false; }
    async applyToDOM(resource: ResourceURL, dom: JSDOM, time?: number) {
        const { wordHits, linkHits } = getHits(dom);
        const promises: Promise<number>[] = [];
        if (await resource.exists(time, VersionType.LINK_HITS))
            resource.versionObject(time, VersionType.LINK_HITS, 1).enqueueInsert({ recursive: true });
        else
            promises.push(resource.writeVersion(time, VersionType.LINK_HITS, linkHits.toBuffer()));
        if (await resource.exists(time, VersionType.WORD_HITS))
            resource.versionObject(time, VersionType.WORD_HITS, 1).enqueueInsert({ recursive: true });
        else
            promises.push(resource.writeVersion(time, VersionType.WORD_HITS, wordHits.toBuffer()));

        await Promise.all(promises);
    }
    from() {
        return [VersionType.RAW_HTML];
    }
    to() {
        return [VersionType.LINK_HITS, VersionType.WORD_HITS];
    }
}
