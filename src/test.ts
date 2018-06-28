import kubecfg from './kubecfg';

class test{
    public async run(){

        var a = process.argv;
        
        // a.push("-c");
        // a.push("/mnt/c/Temp/kube/8/acs_kubeconfig.json");
        // a.push("-u");
        // a.push("Ravenswood-Melb-vsthurs-9");
        
        //a.push("-r");
        //a.push("Ravenswood-Melb-vsthurs-9");
        //a.push("-s");

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
