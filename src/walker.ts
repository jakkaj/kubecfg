"use strict";

import * as walkerClass from "walk";
import * as path from "path";
import * as fs from "fs";

class functionWalker {
    private path: string;
    private walker: any;

    constructor(path: string) {
        this.path = path;

        var options = {            
            filters: ["http-cache", "cache"]
          };

        this.walker = walkerClass.walk(path, options);
    }

    public doWalk(): Promise<Array<string>> {        

        var pusher: Array<string> = [];

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
                } catch (e) {
                    bad(e);
                }

            });
        });
    }
}

export { functionWalker };