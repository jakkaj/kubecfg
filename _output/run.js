#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const kubecfg_1 = require("./kubecfg");
class test {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            var a = process.argv;
            console.log(a);
            var k = new kubecfg_1.default(a);
            yield k.Process();
        });
    }
}
var t = new test();
t.run();
//# sourceMappingURL=run.js.map