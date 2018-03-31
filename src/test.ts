import kubecfg from './kubecfg';

class test{
    public run(){

        var a = process.argv;
        
        a.push("-r");
        a.push("testdata/someconfig.json");
        var k = new kubecfg(a);

    }
}

var t = new test();

t.run();