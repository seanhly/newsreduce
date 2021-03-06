import fs from "fs";
import { Predicate, PredicateID } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { bytesToBigInt, bytesToNumber } from "utils/alpha";
import { Bag } from "ml/bags/Bag";
import { WordID } from "types/db-objects/Word";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { BagByCount } from "ml/bags/BagByCount";
import { ArrayBag } from "ml/bags/ArrayBag";
import { BagComparison } from "ml/bags/BagComparison";

interface PredicateArg {
    id: bigint;
    polarity: boolean | null;
};
interface Arg {
    left: PredicateArg;
    right: PredicateArg;
};

export async function compare(arg: Arg) {
    const oneByte = Buffer.alloc(1);
    const idBytes = Buffer.alloc(12);
    const predicate = new Predicate();
    const leftPredicate = new PredicateID(BigInt((await predicate.singularSelectByID(arg.left.id)).id));
    const rightPredicate = new PredicateID(BigInt((await predicate.singularSelectByID(arg.right.id)).id));
    const leftBag = new Bag<WordID, bigint>(value => new WordID(value), new Map());
    const rightBag = new Bag<WordID, bigint>(value => new WordID(value), new Map());
    const { file: leftTmp } = await leftPredicate.tmpFileLatest(VersionType.BAG_OF_WORDS, Predicate.TRUE_SUFFIX);
    let fd = fs.openSync(leftTmp, "r");
    let offset = 0;
    fs.readSync(fd, oneByte, 0, oneByte.length, offset);
    offset += oneByte.length;
    let lengthBytes = oneByte[0];
    let countBytes = Buffer.alloc(lengthBytes);
    while (fs.readSync(fd, idBytes, 0, idBytes.length, offset) > 0) {
        offset += idBytes.length;
        const id = bytesToBigInt(idBytes);
        fs.readSync(fd, countBytes, 0, lengthBytes, offset);
        offset += lengthBytes;
        const count = bytesToNumber(countBytes);
        leftBag.registerID(id, count);
    }
    fs.closeSync(fd);
    fs.unlinkSync(leftTmp);
    const { file: rightTmp } = await rightPredicate.tmpFileLatest(VersionType.BAG_OF_WORDS, Predicate.FALSE_SUFFIX);
    fd = fs.openSync(rightTmp, "r");
    offset = 0;
    fs.readSync(fd, oneByte, 0, oneByte.length, offset);
    offset += oneByte.length;
    lengthBytes = oneByte[0];
    countBytes = Buffer.alloc(lengthBytes);
    while (fs.readSync(fd, idBytes, 0, idBytes.length, offset) > 0) {
        offset += idBytes.length;
        const id = bytesToBigInt(idBytes);
        fs.readSync(fd, countBytes, 0, lengthBytes, offset);
        offset += lengthBytes;
        const count = bytesToNumber(countBytes);
        rightBag.registerID(id, count);
        if (!leftBag.bag.has(id)) {
            leftBag.registerID(id, 0);
        }
    }
    fs.closeSync(fd);
    fs.unlinkSync(rightTmp);
    const leftMap = leftBag.bag;
    const rightMap = rightBag.bag;
    const reference = [...leftMap.entries()].sort(BagByCount.CMP);
    const subject = new Array<typeof reference[0]>(reference.length);
    let i = 0;
    for (const [id,] of reference)
        subject[i++] = [id, rightMap.get(id) || 0];
    rightMap.clear();
    const cmp = new BagComparison({
        subject: new ArrayBag(subject),
        reference: new ArrayBag(reference),
    });
    cmp.toCSV();
    await Redis.quit();
    (await SQL.db()).destroy();
}

compare({
    left: {
        id: 74364767655049632829344255629n,
        polarity: null,
    },
    right: {
        id: 74364767655049632829344255629n,
        polarity: true,
    },
});
