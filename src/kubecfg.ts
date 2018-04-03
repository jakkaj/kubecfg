#!/usr/bin/env node

import * as program from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const execFile = require('child_process').execFile;

export default class kubecfg {

    private _argv: string;
    private _isWin: boolean;


    constructor(argv) {
        this._argv = argv;
        this._isWin = process.platform === "win32";


        this._process(argv);



    }

    public Process(): Promise<boolean> {

        return new Promise<boolean>(async (good, bad) => {
            var addFile: string = null;
            var removeFile: string = null;

            if (program.show) {
                await this._showVars();
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
            } else {
                try {
                    var result = await this._processWindows(addFile, removeFile);
                    good(result);
                } catch (e) {
                    bad(e);
                }
                good(result);
            }
        });

    }

    private _showVars():Promise<string> {
        return new Promise<string>(async (good, bad)=>{
            var current_config = "";
            if (this._isWin) {
                current_config = await this._runPowershell('[System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');
    
            } else {
                current_config = await this._runBash('. ~/.bashrc | echo $KUBECONFIG');
            }
    
            console.log(`Current config: ${current_config}`);
            good(current_config);
        });

        
     
    }

    private _processWindows(add: string, remove: string): Promise<boolean> {


        return new Promise<boolean>(async (good, bad) => {
           
            try {
                var current_config = await this._showVars();
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
                var resultUpdate = await this._runPowershell(run_current_config);
                // var resultUpdate = await this._runPowershell('$Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');

                console.log('Now run: $Env:KUBECONFIG = [System.Environment]::GetEnvironmentVariable("KUBECONFIG","User")');

                good(true);
            } catch (e) {
                console.log(e);
                bad(e);
            }

        });



    }

    private async _runBash(command: string): Promise<string> {

        return new Promise<string>((good, bad) => {
            var result = execFile("bash", ["-c", command], (error, stdout, stderr) => {
                if (!error) {
                    good(stdout);
                } else {
                    bad(stderr);
                }
            });
        });

    }

    private async _runPowershell(command: string): Promise<string> {
        return new Promise<string>((good, bad) => {
            var result = execFile("powershell", ["-Command", command], (error, stdout, stderr) => {
                if (!error) {
                    good(stdout);
                } else {
                    bad(stderr);
                }
            });
        });
    }

    private async _processLinux(add: string, remove: string) {
        //console.log("********" + process.env.KUBECONFIG);
        //console.log(add);


        var f = path.join(path.resolve(process.env.HOME, ".bashrc"));
        var fcontents = "";

        if (fs.existsSync) {
            fcontents = fs.readFileSync(f, 'utf8');
        }

        var current_config = await this._showVars();
        
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
        } else {
            finalcontents = fcontents + `\n\n#Kubectl configuration\n${current_config}`;
        }



        //console.log(finalcontents);

        fs.writeFileSync(f, finalcontents);
        console.log(`Set: ${current_config}`);
        console.log("Run '. ~/.bashrc' now to refresh your environment.")
    }

    private _tryFixFile(file): string {

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

    private _process(argv) {
        program

            .option('-a, --add [file]', 'Add a file to the Kubectl environment')
            .option('-r, --remove [file]', 'Remove a file from the Kubectl environment')
            .option('-s, --show', 'Show the current config')
            .parse(argv);
    }
}