#!/usr/bin/env node

import * as program from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import * as random from "randomstring";

import {functionWalker} from "./walker";

const execFile = require('child_process').execFile;


interface config{
    currentFile: string
}

export default class kubecfg {

    private _argv: string;
    private _isWin: boolean;
    private _basePath: string;
    private _configPath: string;
    private _configFile: string;
    
    constructor(argv) {
        this._argv = argv;
        this._isWin = process.platform === "win32";

        this._basePath = path.join(os.homedir(), ".kube");
        this._configPath = path.join(os.homedir(), ".kconfig");

        if(!fs.existsSync(this._configPath)){
            fs.mkdirSync(this._configPath);
        }

        if(!fs.existsSync(this._basePath)){
            fs.mkdirSync(this._basePath);
        }

        this._configFile = path.join(os.homedir(), ".kconfig", "config.yaml");

        this._process(argv);
    }

    private _process(argv) {
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

    public Process(): Promise<boolean> {

        return new Promise<boolean>(async (good, bad) => {
            
            if (program.copy) {
                await this._copyFile(program.copy);
                good(true);
                return;
            }

            if(program.list)
            {
                await this._list();
                return;
            }

            if(program.use){
                await this._use(program.use);
                return;
            }

            if(program.show){
                this._show();
                return;
            }           

            if(program.reset){
                this._reset();
                return;
            }
            
            this._show();
        }); 

    }

    private _reset(){        
        var script = path.join(this._configPath, "kubeconfigexport.sh");
        fs.writeFileSync(script, ""); 
        console.log("Cleared. Remember to reload your shell or run . ~/.bashrc")

        var conf = this._getConfig();
        conf.currentFile = "";
        this._setConfig(conf);
    }

    private _export(){
        var file = this._show();
        
        if(!file){            
            return;
        }

        var script = path.join(this._configPath, "kubeconfigexport.sh");
        var bash = `#!/bin/bash\nexport KUBECONFIG=${file}\n`;

        fs.writeFileSync(script, bash); 

        fs.chmodSync(script, "777");
        var rc = path.join(os.homedir(), ".bashrc");

        if(fs.existsSync(rc)){
            var rc = fs.readFileSync(rc, "utf-8");
            if(rc.indexOf("kubeconfigexport.sh") == -1){
                console.log("");
                console.log(`Please update your ~/.bashrc file by adding . ${script} to your `);
                console.log(`Run this update ~/.bashrc -> echo ". ${script}" >> ~/.bashrc && source ~/.bashrc`)
            }
        }        

        console.log("");
        console.log(`Remember to reload your shell or run . ~/.bashrc`);
       
    }
    
    private _show():string{
        var file = this._getConfig().currentFile;
        
        if(!file || file == ""){
            console.log("kubecfg: Nothing set, using kube defaults");
            return null;
        }

        if(!fs.existsSync(file)){
            console.log(`File set to ${file} which DOES NOT EXIST, using kube defaults`);
            return null;
        }

        var doc = this._readFile(file);

        if(!doc){
            console.log(`Could not read ${file}. Perhaps file is borked`);
            return null;
        }

        var context = doc["current-context"];

        if(!context){
            console.log(`Could not read set context in ${file}. Perhaps file is borked`);
            return null;
        }

        console.log(`Current context is ${context} in ${file}`);

        return file;
    }

    private async _use(setContext:string){
        var files = await this._walk();

        for(var f in files){
            var file = files[f];

            if(file === setContext){
                this._set(setContext, null);
                return;
            }

            var doc = this._readFile(file);
            
            if(doc.contexts && doc.contexts.length > 0){
                for(var c in doc.contexts){
                    var context = doc.contexts[c];                    
                    if(context.name == setContext){                        
                        this._set(file, setContext);
                        this._export();
                        return;
                    }                    
                }
            }
        }
        
        console.log(`Could not find any context or file named ${setContext}`);
    }

    private _set(file:string, setContext:string){
        
        if(!fs.existsSync(file)){
            return;
        }

        var doc = this._readFile(file);

        for(var c in doc.contexts){
            var context = doc.contexts[c];                    
            if(context.name == setContext){                
                doc["current-context"] = setContext;                
            }                    
        }

        var d:string;

        if(file.toLowerCase().endsWith('json')){
            d = JSON.stringify(doc);
        }else{
            d = yaml.safeDump(doc);
        }

        fs.writeFileSync(file, d);

        var conf = this._getConfig();

        conf.currentFile = file;

        this._setConfig(conf);
    }

    private _getConfig(): config{
        
        var conf: config;
        
        if(!fs.existsSync(this._configFile)){
            conf = {
                currentFile: ""
            }
        }else{
            conf = this._readFile(this._configFile);
        }

        return conf;
    }

    private _setConfig(conf:config){
        var conf = yaml.safeDump(conf);
        fs.writeFileSync(this._configFile, conf);
    }

    private async _list(){
        var files = await this._walk();

        for(var f in files){
            var file = files[f];
            var doc = this._readFile(file);
            if(!doc){
                continue;
            }

            if(doc.contexts && doc.contexts.length > 0){
                for(var c in doc.contexts){
                    var context = doc.contexts[c];
                    console.log(`${context.name} in ${file}`);
                }
            }

        }
    }

    private _readFile(file:string):any{
        if(!fs.existsSync(file))
        {
            return null;
        }

        try{
            var doc = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
            return doc;
        }catch(e){
            console.log(`Could not load ${file}`);
        }       
    }

    private async _walk(): Promise<Array<string>>{
        var fw = new functionWalker(this._basePath);
        var files = await fw.doWalk();
        return files;
    }

    private _copyFile(file:string){
        if(!fs.existsSync(file)){
            console.log(`File not found: ${file}`);
            return;
        }

        var fn = path.basename(file);

        var target = path.join(this._basePath, fn);

        while(fs.existsSync(target)){
            var rnd = random.generate({
                length: 5,
                charset: 'alphabetic'
            });
            
            target = path.join(this._basePath, fn);

            if(target.indexOf(".")!=-1){
                var ext = target.split('.').pop();
                var targetNoExt = target.replace(`.${ext}`, '');
                target = `${targetNoExt}_${rnd}.${ext}`;
            }else{
                target += rnd;
            }      

            console.log(`File exists at target, modifying to: ${target}`);      
        }

        fs.copyFileSync(file, target, );
        console.log(`Copied to : ${target}`);
    }   

   

   

    // private _showVars():Promise<string> {
    //     return new Promise<string>(async (good, bad)=>{
    //         var current_config = "";
    //         if (this._isWin) {
    //             current_config = await this._runPowershell('[System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');
    
    //         } else {
    //             current_config = await this._runBash('. ~/.bashrc | echo $KUBECONFIG');
    //         }
    
    //         console.log(`Current config: ${current_config}`);
    //         good(current_config);
    //     });

        
     
    // }


    // private _processWindows(add: string, remove: string): Promise<boolean> {


    //     return new Promise<boolean>(async (good, bad) => {
           
    //         try {
    //             var current_config = await this._showVars();
    //             current_config = current_config.replace(/^\n+|\n+$/g, '');
    //             current_config = current_config.replace(/^\r+|\r+$/g, '');
               
    //             if (!current_config) {
    //                 current_config = "";
    //             }
    //             if (add != null) {

    //                 if (current_config.indexOf(add) == -1) {
    //                     current_config += `;${add}`;
    //                 }
    //             }

    //             if (remove != null) {
    //                 current_config = current_config.replace(remove, "");
    //                 current_config = current_config.replace(";;", ";");
    //             }

    //             current_config = current_config.replace(/^;+|;+$/g, '');

    //             console.log(`Setting config: ${current_config}`);

    //             var run_current_config = `[Environment]::SetEnvironmentVariable("KUBECONFIG", "${current_config}", "User")`;
    //             var resultUpdate = await this._runPowershell(run_current_config);
    //             // var resultUpdate = await this._runPowershell('$Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');

    //             console.log('Now run: $Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');

    //             good(true);
    //         } catch (e) {
    //             console.log(e);
    //             bad(e);
    //         }

    //     });



    // }

    // private async _runBash(command: string): Promise<string> {

    //     return new Promise<string>((good, bad) => {
    //         var result = execFile("bash", ["-c", command], (error, stdout, stderr) => {
    //             if (!error) {
    //                 good(stdout);
    //             } else {
    //                 bad(stderr);
    //             }
    //         });
    //     });

    // }

    // private async _runPowershell(command: string): Promise<string> {
    //     return new Promise<string>((good, bad) => {
    //         var result = execFile("powershell", ["-Command", command], (error, stdout, stderr) => {
    //             if (!error) {
    //                 good(stdout);
    //             } else {
    //                 bad(stderr);
    //             }
    //         });
    //     });
    // }

    // private async _processLinux(add: string, remove: string) {
    //     //console.log("********" + process.env.KUBECONFIG);
    //     //console.log(add);


    //     var f = path.join(path.resolve(process.env.HOME, ".bashrc"));
    //     var fcontents = "";

    //     if (fs.existsSync) {
    //         fcontents = fs.readFileSync(f, 'utf8');
    //     }

    //     var current_config = await this._showVars();
        
    //     if (!current_config) {
    //         current_config = "";
    //     }

    //     current_config = current_config.trim();

    //     if (add != null) {

    //         if (current_config.indexOf(add) == -1) {
    //             current_config += `:${add}`;
    //         }
    //     }

    //     if (remove != null) {
    //         current_config = current_config.replace(remove, "");            
    //     }

    //     if (current_config.trim() != "") {
    //         current_config = `export KUBECONFIG=${current_config}\n`;
    //     }

    //     current_config = current_config.replace("::", ":");
    //     current_config = current_config.replace(/^:+|:+(\n?)$/g, '');        

    //     //find current in the bashrc, if there, kill that line
    //     //the current set config is king
    //     var finalcontents = "";

    //     if (fcontents.indexOf("KUBECONFIG") != -1) {
    //         finalcontents = fcontents.replace(/(\n)((.*?)KUBECONFIG.*?\n)/gi, `\n${current_config}`);
    //     } else {
    //         finalcontents = fcontents + `\n\n#Kubectl configuration\n${current_config}`;
    //     }



    //     //console.log(finalcontents);

    //     fs.writeFileSync(f, finalcontents);
    //     console.log(`Set: ${current_config}`);
    //     console.log("Run '. ~/.bashrc' now to refresh your environment.")
    // }

    // private _tryFixFile(file): string {

    //     if (this._isWin) {

    //         var home = os.homedir();

    //         if (file != null) {
    //             file = file.replace("~", home);
    //         }
    //     }

    //     var full = path.resolve(file);

    //     if (fs.existsSync(full)) {
    //         return full;
    //     }

    //     return null;
    // }

}