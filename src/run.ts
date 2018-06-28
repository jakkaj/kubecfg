#!/usr/bin/env node

import kubecfg from './kubecfg';

class test{
    public async run(){

        var a = process.argv;
        console.log(a);
        var k = new kubecfg(a);
        await k.Process();
    }
}

var t = new test();

t.run();