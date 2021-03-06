import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { getLinks } from "services/resource-processor/ExtractAHrefs";
import { getHits } from "services/resource-processor/ExtractHits";
import { toRawText } from "services/resource-processor/ExtractRawText";
import { getEntities, ExtractWikiTree } from "services/resource-processor/ExtractWikiTree";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { WikiCategory } from "types/db-objects/WikiCategory";
import { WikiPage } from "types/db-objects/WikiPage";
import { WordHits } from "types/WordHits";

test("extract hits works", async () => {
    const src = "http://src.com/";
    const html = `<!doctype html>
<h1>Title</h1>
<p><script>foo</script><b><a href="/wiki/History_of_the_British_farthing" title="History of the British farthing">Historically, the British farthing</a></b> was a continuation of the <a href="/wiki/Farthing_(English_coin)" title="Farthing (English coin)">English farthing</a>, a coin struck by English monarchs prior to the <a href="/wiki/Acts_of_Union_1707" title="Acts of Union 1707">Act of Union 1707</a> that was worth a quarter of an <a href="/wiki/Penny_(British_pre-decimal_coin)" title="Penny (British pre-decimal coin)">old penny</a> <span class="nowrap">(​<span class="frac nowrap"><sup>1</sup>⁄<sub>960</sub></span></span> of a <a href="/wiki/Pound_sterling" title="Pound sterling">pound sterling</a>). Only <a href="/wiki/Pattern_coin" title="Pattern coin">pattern</a> farthings were struck under <a href="/wiki/Anne,_Queen_of_Great_Britain" title="Anne, Queen of Great Britain">Queen Anne</a>. The coin was struck intermittently through much of the 18th century, but counterfeits became so prevalent the <a href="/wiki/Royal_Mint" title="Royal Mint">Royal Mint</a> ceased striking them after 1775. The next farthings were the first ones struck by steam power, in 1799 by <a href="/wiki/Matthew_Boulton" title="Matthew Boulton">Matthew Boulton</a> at his <a href="/wiki/Soho_Mint" title="Soho Mint">Soho Mint</a>. The Royal Mint resumed production in 1821. The farthing was struck regularly under <a href="/wiki/George_IV_of_the_United_Kingdom" title="George IV of the United Kingdom">George&nbsp;IV</a>, <a href="/wiki/William_IV_of_the_United_Kingdom" title="William IV of the United Kingdom">William&nbsp;IV</a> and in most years of <a href="/wiki/Queen_Victoria" title="Queen Victoria">Queen Victoria</a>'s long reign. The coin continued to be issued in most years of the first half of the 20th century, and in 1937 it finally received its own design, a <a href="/wiki/Wren" title="Wren">wren</a> <i>(pictured)</i>. By the 1950s, inflation had eroded its value. It ceased to be struck after 1956 and was demonetised in 1961. (<b><a href="/wiki/History_of_the_British_farthing" title="History of the British farthing">Full&nbsp;article...</a></b>)
</p>
<a href="mailto:sean@seanh.sh">Email</a>
    `;
    const doc = new JSDOM(html, { url: src });
    const { wordHits, linkHits } = getHits(doc);
    const buffer = wordHits.toBuffer();
    const actualHits = new WordHits().fromBuffer(buffer);
    expect(actualHits.toString()).toBe(wordHits.toString());
});

test("get links works", async () => {
    const src = "http://src.com/";
    const dst = [
        "http://dst.com/1",
        "http://dst.com/2",
        "http://dst.com/3",
        "http://dst.com/4",
        "http://dst.com/5",
        "http://dst.com/6",
        "http://dst.com/7#id1",
        "http://dst.com/8",
    ];
    const html = `<!doctype html>
	${dst.map(url => `<a href="${url}">url</a>`).join("\n")}
	<a href="mailto:sean@seanh.sh">Email</a>
    `;
    const doc = new JSDOM(html, { url: src });
    const linkObjects = getLinks(doc);
    const links = linkObjects.map(obj => obj.toString());
    expect(links).toStrictEqual([
        'http://src.com/-->http://dst.com/1',
        'http://src.com/-->http://dst.com/2',
        'http://src.com/-->http://dst.com/3',
        'http://src.com/-->http://dst.com/4',
        'http://src.com/-->http://dst.com/5',
        'http://src.com/-->http://dst.com/6',
        'http://src.com/-->http://dst.com/7#id1',
        'http://src.com/-->http://dst.com/8',
    ]);
});


test("get raw text works", async () => {
    const src = "http://src.com/";
    const html = `<!doctype html>
<h1>Title</h1>
<p><script>foo</script><b><a href="/wiki/History_of_the_British_farthing" title="History of the British farthing">Historically, the British farthing</a></b> was a continuation of the <a href="/wiki/Farthing_(English_coin)" title="Farthing (English coin)">English farthing</a>, a coin struck by English monarchs prior to the <a href="/wiki/Acts_of_Union_1707" title="Acts of Union 1707">Act of Union 1707</a> that was worth a quarter of an <a href="/wiki/Penny_(British_pre-decimal_coin)" title="Penny (British pre-decimal coin)">old penny</a> <span class="nowrap">(​<span class="frac nowrap"><sup>1</sup>⁄<sub>960</sub></span></span> of a <a href="/wiki/Pound_sterling" title="Pound sterling">pound sterling</a>). Only <a href="/wiki/Pattern_coin" title="Pattern coin">pattern</a> farthings were struck under <a href="/wiki/Anne,_Queen_of_Great_Britain" title="Anne, Queen of Great Britain">Queen Anne</a>. The coin was struck intermittently through much of the 18th century, but counterfeits became so prevalent the <a href="/wiki/Royal_Mint" title="Royal Mint">Royal Mint</a> ceased striking them after 1775. The next farthings were the first ones struck by steam power, in 1799 by <a href="/wiki/Matthew_Boulton" title="Matthew Boulton">Matthew Boulton</a> at his <a href="/wiki/Soho_Mint" title="Soho Mint">Soho Mint</a>. The Royal Mint resumed production in 1821. The farthing was struck regularly under <a href="/wiki/George_IV_of_the_United_Kingdom" title="George IV of the United Kingdom">George&nbsp;IV</a>, <a href="/wiki/William_IV_of_the_United_Kingdom" title="William IV of the United Kingdom">William&nbsp;IV</a> and in most years of <a href="/wiki/Queen_Victoria" title="Queen Victoria">Queen Victoria</a>'s long reign. The coin continued to be issued in most years of the first half of the 20th century, and in 1937 it finally received its own design, a <a href="/wiki/Wren" title="Wren">wren</a> <i>(pictured)</i>. By the 1950s, inflation had eroded its value. It ceased to be struck after 1956 and was demonetised in 1961. (<b><a href="/wiki/History_of_the_British_farthing" title="History of the British farthing">Full&nbsp;article...</a></b>)
</p>
<a href="mailto:sean@seanh.sh">Email</a>
    `;
    const doc = new JSDOM(html, { url: src });
    const rawText = toRawText(doc);

    const expected = `Title
Historically, the British farthing was a continuation of the English farthing, a coin struck by English monarchs prior to the Act of Union 1707 that was worth a quarter of an old penny (​1⁄960 of a pound sterling). Only pattern farthings were struck under Queen Anne. The coin was struck intermittently through much of the 18th century, but counterfeits became so prevalent the Royal Mint ceased striking them after 1775. The next farthings were the first ones struck by steam power, in 1799 by Matthew Boulton at his Soho Mint. The Royal Mint resumed production in 1821. The farthing was struck regularly under George IV, William IV and in most years of Queen Victoria's long reign. The coin continued to be issued in most years of the first half of the 20th century, and in 1937 it finally received its own design, a wren (pictured). By the 1950s, inflation had eroded its value. It ceased to be struck after 1956 and was demonetised in 1961. (Full article...)

Email
`
    expect(rawText.replace(/\s/g, "")).toBe(expected.replace(/\s/g, ""));
});

test("check if resource is wiki category", () => {
    const url = new ResourceURL("https://en.wikipedia.org/wiki/Category:News");
    const actual = new ExtractWikiTree().resourceMatch(url);
    expect(actual).toBe(true);
});

test("get wiki entities works", () => {
    const url = "https://en.wikipedia.org/wiki/Category:News"
    const file = path.join(__dirname, "html/0001.html");
    const content = fs.readFileSync(file);
    const doc = new JSDOM(content, { url });
    const { subCategories, subPages }= getEntities(doc);
    expect(subCategories.length).toBe(26);
    expect(subPages.length).toBe(12);
});
