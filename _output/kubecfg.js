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
const yaml = require("js-yaml");
const random = require("randomstring");
const walker_1 = require("./walker");
const execFile = require('child_process').execFile;
class kubecfg {
    constructor(argv) {
        this._argv = argv;
        this._isWin = process.platform === "win32";
        this._basePath = path.join(os.homedir(), ".kube");
        this._configPath = path.join(os.homedir(), ".kconfig");
        if (!fs.existsSync(this._configPath)) {
            fs.mkdirSync(this._configPath);
        }
        if (!fs.existsSync(this._basePath)) {
            fs.mkdirSync(this._basePath);
        }
        this._configFile = path.join(os.homedir(), ".kconfig", "config.yaml");
        this._process(argv);
    }
    _process(argv) {
        program
            //set base path
            //copy file to base
            //set context
            .option('-c, --copy [file]', 'Copy a file to the Kubectl environment')
            .option('-u, --use [context]', 'Change the current context. Pass in a filename or context name')
            //.option('-r, --remove [file]', 'Remove a file from the Kubectl environment')
            .option('-s, --show', 'Show the current config')
            .option('-l, --list', 'List all configs')
            .option('-r, --reset', "Clear the config and go back to kube defaults")
            //.option('-w, --working', 'Set the config base working folder')
            .parse(argv);
    }
    Process() {
        return new Promise((good, bad) => __awaiter(this, void 0, void 0, function* () {
            if (program.copy) {
                yield this._copyFile(program.copy);
                good(true);
                return;
            }
            if (program.list) {
                yield this._list();
                return;
            }
            if (program.use) {
                yield this._use(program.use);
                return;
            }
            if (program.show) {
                this._show();
                return;
            }
            if (program.reset) {
                this._reset();
                return;
            }
            this._show();
        }));
    }
    _reset() {
        var script = path.join(this._configPath, "kubeconfigexport.sh");
        fs.writeFileSync(script, "");
        console.log("Cleared. Remember to reload your shell or run . ~/.bashrc");
        var conf = this._getConfig();
        conf.currentFile = "";
        this._setConfig(conf);
    }
    _export() {
        var file = this._show();
        if (!file) {
            return;
        }
        var script = path.join(this._configPath, "kubeconfigexport.sh");
        var bash = `#!/bin/bash\nexport KUBECONFIG=${file}\n`;
        fs.writeFileSync(script, bash);
        fs.chmodSync(script, "777");
        var rc = path.join(os.homedir(), ".bashrc");
        if (fs.existsSync(rc)) {
            var rc = fs.readFileSync(rc, "utf-8");
            if (rc.indexOf("kubeconfigexport.sh") == -1) {
                console.log("");
                console.log(`Please update your ~/.bashrc file by adding . ${script} to your `);
                console.log(`Run this update ~/.bashrc -> echo ". ${script}" >> ~/.bashrc && source ~/.bashrc`);
            }
        }
        console.log("");
        console.log(`Remember to reload your shell or run . ~/.bashrc`);
    }
    _show() {
        var file = this._getConfig().currentFile;
        if (!file || file == "") {
            console.log("kubecfg: Nothing set, using kube defaults");
            return null;
        }
        if (!fs.existsSync(file)) {
            console.log(`File set to ${file} which DOES NOT EXIST, using kube defaults`);
            return null;
        }
        var doc = this._readFile(file);
        if (!doc) {
            console.log(`Could not read ${file}. Perhaps file is borked`);
            return null;
        }
        var context = doc["current-context"];
        if (!context) {
            console.log(`Could not read set context in ${file}. Perhaps file is borked`);
            return null;
        }
        console.log(`Current context is ${context} in ${file}`);
        return file;
    }
    _use(setContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var files = yield this._walk();
            for (var f in files) {
                var file = files[f];
                if (file === setContext) {
                    this._set(setContext, null);
                    return;
                }
                var doc = this._readFile(file);
                if (doc.contexts && doc.contexts.length > 0) {
                    for (var c in doc.contexts) {
                        var context = doc.contexts[c];
                        if (context.name == setContext) {
                            this._set(file, setContext);
                            this._export();
                            return;
                        }
                    }
                }
            }
            console.log(`Could not find any context or file named ${setContext}`);
        });
    }
    _set(file, setContext) {
        if (!fs.existsSync(file)) {
            return;
        }
        var doc = this._readFile(file);
        for (var c in doc.contexts) {
            var context = doc.contexts[c];
            if (context.name == setContext) {
                doc["current-context"] = setContext;
            }
        }
        var d;
        if (file.toLowerCase().endsWith('json')) {
            d = JSON.stringify(doc);
        }
        else {
            d = yaml.safeDump(doc);
        }
        fs.writeFileSync(file, d);
        var conf = this._getConfig();
        conf.currentFile = file;
        this._setConfig(conf);
    }
    _getConfig() {
        var conf;
        if (!fs.existsSync(this._configFile)) {
            conf = {
                currentFile: ""
            };
        }
        else {
            conf = this._readFile(this._configFile);
        }
        return conf;
    }
    _setConfig(conf) {
        var conf = yaml.safeDump(conf);
        fs.writeFileSync(this._configFile, conf);
    }
    _list() {
        return __awaiter(this, void 0, void 0, function* () {
            var files = yield this._walk();
            for (var f in files) {
                var file = files[f];
                var doc = this._readFile(file);
                if (!doc) {
                    continue;
                }
                if (doc.contexts && doc.contexts.length > 0) {
                    for (var c in doc.contexts) {
                        var context = doc.contexts[c];
                        console.log(`${context.name} in ${file}`);
                    }
                }
            }
        });
    }
    _readFile(file) {
        if (!fs.existsSync(file)) {
            return null;
        }
        try {
            var doc = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
            return doc;
        }
        catch (e) {
            console.log(`Could not load ${file}`);
        }
    }
    _walk() {
        return __awaiter(this, void 0, void 0, function* () {
            var fw = new walker_1.functionWalker(this._basePath);
            var files = yield fw.doWalk();
            return files;
        });
    }
    _copyFile(file) {
        if (!fs.existsSync(file)) {
            console.log(`File not found: ${file}`);
            return;
        }
        var fn = path.basename(file);
        var target = path.join(this._basePath, fn);
        while (fs.existsSync(target)) {
            var rnd = random.generate({
                length: 5,
                charset: 'alphabetic'
            });
            target = path.join(this._basePath, fn);
            if (target.indexOf(".") != -1) {
                var ext = target.split('.').pop();
                var targetNoExt = target.replace(`.${ext}`, '');
                target = `${targetNoExt}_${rnd}.${ext}`;
            }
            else {
                target += rnd;
            }
            console.log(`File exists at target, modifying to: ${target}`);
        }
        fs.copyFileSync(file, target);
        console.log(`Copied to : ${target}`);
    }
}
exports.default = kubecfg;
//# sourceMappingURL=kubecfg.js.map