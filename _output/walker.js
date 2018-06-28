"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const walkerClass = require("walk");
const path = require("path");
class functionWalker {
    constructor(path) {
        this.path = path;
        var options = {
            filters: ["http-cache", "cache"]
        };
        this.walker = walkerClass.walk(path, options);
    }
    doWalk() {
        var pusher = [];
        return new Promise((good, bad) => {
            this.walker.on("file", (root, fileStats, next) => {
                var name = path.join(root, fileStats.name);
                pusher.push(name);
                next();
            });
            this.walker.on("errors", function (root, nodeStatsArray, next) {
                next();
            });
            this.walker.on("end", () => {
                try {
                    good(pusher);
                }
                catch (e) {
                    bad(e);
                }
            });
        });
    }
}
exports.functionWalker = functionWalker;
//# sourceMappingURL=walker.js.map