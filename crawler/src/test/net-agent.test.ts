import "./setup.ts";
import { getParams } from "common/config";

test("net agent communication possible", async () => {
    const params = await getParams();
    expect("sql" in params).toBe(true);
});
