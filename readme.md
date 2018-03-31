# kubecfg

A simple command line tool to add and remove kubectl config files to your environment. 

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