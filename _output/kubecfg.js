#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const fs = require("fs");
const path = require("path");
const execFile = require('child_process').execFile;
class kubecfg {
    constructor(argv) {
        this._argv = argv;
        this._isWin = process.platform === "win32";
        this._process(argv);
        var addFile = null;
        var removeFile = null;
        if (program.add) {
            addFile = program.add;
            addFile = this._tryFixFile(addFile);
            //console.log(addFile);
        }
        if (program.remove) {
            removeFile = program.remove;
            removeFile = this._tryFixFile(removeFile);
        }
        if (!addFile && !removeFile) {
            console.log("No switches passed");
            console.log(program.help());
            return;
        }
        if (!this._isWin) {
            this._processLinux(addFile, removeFile);
        }
    }
    _processLinux(add, remove) {
        //console.log("********" + process.env.KUBECONFIG);
        //console.log(add);
        var f = path.join(path.resolve(process.env.HOME, ".bashrc"));
        var fcontents = "";
        if (fs.existsSync) {
            fcontents = fs.readFileSync(f, 'utf8');
        }
        var current_config = process.env.KUBECONFIG;
        if (add != null) {
            if (current_config.indexOf(add) == -1) {
                current_config += `:${add}`;
            }
        }
        if (remove != null) {
            current_config = current_config.replace(remove, "");
            current_config = current_config.replace("::", ":");
        }
        if (current_config.trim() != "") {
            current_config = `export KUBECONFIG=${current_config}\n`;
        }
        //find current in the bashrc, if there, kill that line
        //the current set config is king
        var finalcontents = "";
        if (fcontents.indexOf("KUBECONFIG") != -1) {
            finalcontents = fcontents.replace(/(\n)((.*?)KUBECONFIG.*?\n)/gi, `\n${current_config}`);
        }
        else {
            finalcontents += `#Kubectl configuration\n${current_config}`;
        }
        //console.log(finalcontents);
        fs.writeFileSync(f, finalcontents);
        console.log(`Set: ${current_config}`);
        console.log("Run '. ~/.bashrc' now to refresh your environment.");
    }
    _tryFixFile(file) {
        var full = path.resolve(file);
        if (fs.existsSync(full)) {
            return full;
        }
        return null;
    }
    _process(argv) {
        program
            .option('-a, --add [file]', 'Add a file to the Kubectl environment')
            .option('-r, --remove [file]', 'Remove a file from the Kubectl environment')
            .parse(argv);
    }
}
exports.default = kubecfg;
//# sourceMappingURL=kubecfg.js.map