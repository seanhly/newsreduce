import { Redis, REDIS_PARAMS } from "./Redis";
import { fancyLog, setImmediateInterval } from "../utils/alpha";

const ZERO = BigInt(0);
const ONE = BigInt(1)

export function start(birthLog: string, deathLog: string, idBytes: number) {
    const MAX_ID = (ONE << BigInt(8 * idBytes));
    let dob = new Map<string, number>();

    function sourceWorker(id: string) {
        const old = dob.has(id);
        dob.set(id, Date.now());
        if (!old) fancyLog(`new worker: ${id}`);
        reAssemble();
    }
    function retireWorker(id: string) {
        fancyLog(`retire worker ${id}`);
        dob.delete(id);
        reAssemble();
    }
    function retireWorkers(ids: string[]) {
        fancyLog(`retire workers: ${JSON.stringify(ids)}`);
        for (const id of ids) dob.delete(id);
        reAssemble();
    }
    function reAssemble() {
        if (dob.size === 0) return;
        const idsPerWorker = MAX_ID / BigInt(dob.size);
        let lo = ZERO;
        for (const [id,] of dob) {
            let hi = lo + idsPerWorker;
            if (hi + idsPerWorker > MAX_ID) hi = MAX_ID;
            Redis.renewRedis(REDIS_PARAMS.local).publish(id, `${lo} ${hi}`);
            lo += idsPerWorker;
        }
    }
    const birthsSub = Redis.newSub(REDIS_PARAMS.local);
    birthsSub.client.subscribe(birthLog);
    birthsSub.client.on("message", (_, id) => sourceWorker(id));
    const deathsSub = Redis.newSub(REDIS_PARAMS.local);
    deathsSub.client.subscribe(deathLog);
    deathsSub.client.on("message", (_, id) => retireWorker(id));

    setImmediateInterval(() => {
        const now = Date.now();
        const toRetire = [];
        for (const [id, lastCheckup] of dob)
            if (now - lastCheckup > 10000) toRetire.push(id);
        if (toRetire.length !== 0)
            retireWorkers(toRetire);
    }, 10000);
    fancyLog(`Zookeeper started watching events for ${birthLog} and ${deathLog}`);
}
