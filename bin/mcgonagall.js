#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const mcgonagall = require('../src/index')

require('yargs')
  .usage('$0 <command> [options]')
  .command({
    command: 'transfigure <source> [target]',
    aliases: [],
    desc: 'transfigures a source specification (directory or tarball) into a Kubernetes compatible cluster specificiation.',
    builder: {
      apiVersion: {
        alias: 'v',
        describe: 'the Kubernetes API to build manifests for',
        default: '1.7'
      }
    },
    handler: (argv) => {
      if (!fs.existsSync(path.resolve(argv.source))) {
        console.error(`I'll not have my time wasted chasing down non-existent specifications!`)
        process.exit(100)
      }
      mcgonagall
        .transfigure(argv.source, { version: argv.apiVersion, output: argv.target })
        .then(
          result => {
            if (argv.target) {
              console.log(`There, all done. See '${path.resolve(argv.target)}' for the files.`)
            } else {
              process.stdout.write(JSON.stringify(result, null, 2))
            }
          },
          err => {
            console.error(`I'm afraid there's a problem in the specification. Have a biscuit.\n ${err}`)
            process.exit(100)
          }
        )
    }
  })
  .demandCommand(1, 'Well? Did you need something?')
  .help()
  .version()
  .argv
