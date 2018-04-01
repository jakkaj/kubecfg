# kubecfg

A simple command line tool to add and remove kubectl config files to your environment. 

The basic premise is this: You have a number of Kube environments. kubectl supports having those environment configs in different files. This app helps you add and remove files to the saved kubectl environment variable $KUBECONFIG. It saves this in ~/.bashrc. 

Find the file you want to add, run `kubecfg -a <filename>` and boom, added. `-r` to remove it. 

**Note** This is not currently working on Windows in Powershell or CMD, only Bash. It's a work in progress. 

## Installation

- Requires [node.js](https://nodejs.org/en/download/)

```
npm install -g kubectl
```

## Usage

Navigate to the path that your config file resides and type:

```
kubecfg -a <filename>
```

To remove that file 

```
kubecfg -r <filename>
```

This will update your .bashrc with the new paths. 

You'll need to reload .bashrc after you've run the app (any assistance on how to elegantly do this automatically is welcome!)

```
. ~/.bashrc
```

![kubecfg_good](https://user-images.githubusercontent.com/5225782/38168190-c7501062-3588-11e8-8d5f-919ad61b52b6.gif)
