# Milos

**Milos** is a simple scripting language which allows to create Milovana EOS scripts using a text editor.

Milos converts the script into a JSON file which can imported using the backup function in EOS editor.

## Installation

Make sure you have **npm** and **node** installed on your PC. Open your terminal, go to the milos directory and install the dependencies.

    npm install .
    npm run build



## How to use

You can convert any script you like using the milos command:

    npm run milos -- -m <module> -m <module> -o <output.json> <inputfile>


**Important:** Make sure you disable 'files' and 'galleries' when importing the JSON file. Otherwise all uploaded files will be removed.


## Examples

All examples will generate an `output.json` which can be imported using the EOS editor backup function.

Simple example:

    npm run milos -- examples/milos-eos/000-helloworld.txt

Variable example:

    npm run milos -- -m milos-eos-variable examples/milos-eos-variable/000-counter.txt

Maze example: (**NOTE:** This example is not included and will be available on Milovana soon)

    npm run milos -- -m milos-eos-variable -m milos-eos-maze ./examples/milos-eos-maze/script.txt


