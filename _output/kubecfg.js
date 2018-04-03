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
const program = require("commander");
const fs = require("fs");
const path = require("path");
const os = require("os");
const execFile = require('child_process').execFile;
class kubecfg {
    constructor(argv) {
        this._argv = argv;
        this._isWin = process.platform === "win32";
        this._process(argv);
    }
    Process() {
        return new Promise((good, bad) => __awaiter(this, void 0, void 0, function* () {
            var addFile = null;
            var removeFile = null;
            if (program.show) {
                yield this._showVars();
                good(true);
                return;
            }
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
                good(true);
            }
            else {
                try {
                    var result = yield this._processWindows(addFile, removeFile);
                    good(result);
                }
                catch (e) {
                    bad(e);
                }
                good(result);
            }
        }));
    }
    _showVars() {
        return new Promise((good, bad) => __awaiter(this, void 0, void 0, function* () {
            var current_config = "";
            if (this._isWin) {
                current_config = yield this._runPowershell('[System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');
            }
            else {
                current_config = yield this._runBash('. ~/.bashrc | echo $KUBECONFIG');
            }
            console.log(`Current config: ${current_config}`);
            good(current_config);
        }));
    }
    _processWindows(add, remove) {
        return new Promise((good, bad) => __awaiter(this, void 0, void 0, function* () {
            try {
                var current_config = yield this._showVars();
                current_config = current_config.replace(/^\n+|\n+$/g, '');
                current_config = current_config.replace(/^\r+|\r+$/g, '');
                if (!current_config) {
                    current_config = "";
                }
                if (add != null) {
                    if (current_config.indexOf(add) == -1) {
                        current_config += `;${add}`;
                    }
                }
                if (remove != null) {
                    current_config = current_config.replace(remove, "");
                    current_config = current_config.replace(";;", ";");
                }
                current_config = current_config.replace(/^;+|;+$/g, '');
                console.log(`Setting config: ${current_config}`);
                var run_current_config = `[Environment]::SetEnvironmentVariable("KUBECONFIG", "${current_config}", "User")`;
                var resultUpdate = yield this._runPowershell(run_current_config);
                // var resultUpdate = await this._runPowershell('$Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');
                console.log('Now run: $Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');
                good(true);
            }
            catch (e) {
                console.log(e);
                bad(e);
            }
        }));
    }
    _runBash(command) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((good, bad) => {
                var result = execFile("bash", ["-c", command], (error, stdout, stderr) => {
                    if (!error) {
                        good(stdout);
                    }
                    else {
                        bad(stderr);
                    }
                });
            });
        });
    }
    _runPowershell(command) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((good, bad) => {
                var result = execFile("powershell", ["-Command", command], (error, stdout, stderr) => {
                    if (!error) {
                        good(stdout);
                    }
                    else {
                        bad(stderr);
                    }
                });
            });
        });
    }
    _processLinux(add, remove) {
        return __awaiter(this, void 0, void 0, function* () {
            //console.log("********" + process.env.KUBECONFIG);
            //console.log(add);
            var f = path.join(path.resolve(process.env.HOME, ".bashrc"));
            var fcontents = "";
            if (fs.existsSync) {
                fcontents = fs.readFileSync(f, 'utf8');
            }
            var current_config = yield this._showVars();
            if (!current_config) {
                current_config = "";
            }
            current_config = current_config.trim();
            if (add != null) {
                if (current_config.indexOf(add) == -1) {
                    current_config += `:${add}`;
                }
            }
            if (remove != null) {
                current_config = current_config.replace(remove, "");
            }
            if (current_config.trim() != "") {
                current_config = `export KUBECONFIG=${current_config}\n`;
            }
            current_config = current_config.replace("::", ":");
            current_config = current_config.replace(/^:+|:+(\n?)$/g, '');
            //find current in the bashrc, if there, kill that line
            //the current set config is king
            var finalcontents = "";
            if (fcontents.indexOf("KUBECONFIG") != -1) {
                finalcontents = fcontents.replace(/(\n)((.*?)KUBECONFIG.*?\n)/gi, `\n${current_config}`);
            }
            else {
                finalcontents = fcontents + `\n\n#Kubectl configuration\n${current_config}`;
            }
            //console.log(finalcontents);
            fs.writeFileSync(f, finalcontents);
            console.log(`Set: ${current_config}`);
            console.log("Run '. ~/.bashrc' now to refresh your environment.");
        });
    }
    _tryFixFile(file) {
        if (this._isWin) {
            var home = os.homedir();
            if (file != null) {
                file = file.replace("~", home);
            }
        }
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
            .option('-s, --show', 'Show the current config')
            .parse(argv);
    }
}
exports.default = kubecfg;
//# sourceMappingURL=kubecfg.js.map