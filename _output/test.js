"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const kubecfg_1 = require("./kubecfg");
class test {
    run() {
        var a = process.argv;
        a.push("-r");
        a.push("testdata/someconfig.json");
        var k = new kubecfg_1.default(a);
    }
}
var t = new test();
t.run();
//# sourceMappingURL=test.js.map