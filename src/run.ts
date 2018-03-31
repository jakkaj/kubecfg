#!/usr/bin/env node

import kubecfg from './kubecfg';

class test{
    public run(){

        var a = process.argv;
        
        var k = new kubecfg(a);

    }
}

var t = new test();

t.run();