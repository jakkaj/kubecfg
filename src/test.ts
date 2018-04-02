import kubecfg from './kubecfg';

class test{
    public async run(){

        var a = process.argv;
        
        a.push("-a");
        a.push("testdata/someconfig.json");
        var k = new kubecfg(a);
        try{
            await k.Process();
        }catch(e){
            throw e;
        }
        

    }
}

var t = new test();
try{
    t.run();
}catch(e){
    throw e;
}
