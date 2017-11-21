#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const mcgonagall = require('../src/index')
const Promise = require('bluebird')
const inquirer = require('inquirer')
const toml = require('toml-j0.4')
const yaml = require('js-yaml')

const SECRET_RGX = /(pass$|password|passwd|secret|secrt|scrt|secure)/i
const prompt = inquirer.createPromptModule()

function acquireTokens (tokens) {
  return Promise.mapSeries(tokens, (token) => {
    const type = SECRET_RGX.test(token) ? 'password' : 'input'
    return prompt({
      type: type,
      name: token,
      message: `'${token}'`,
      validate: (x) => {
        if (x === '' || x === undefined || x === null) {
          return 'Please provide a proper value for the token.'
        }
        return true
      }
    })
  }).then(list => {
    return list.reduce((acc, answer) => {
      Object.assign(acc, answer)
      return acc
    }, {})
  })
}

function transfigure (argv) {
  if (argv.tokenFile) {
    const tokenFile = path.resolve(argv.tokenFile)
    if (fs.existsSync(tokenFile)) {
      const raw = fs.readFileSync(tokenFile, 'utf8')
      try {
        switch (path.extname(tokenFile)) {
          case '.toml':
            argv.data = toml.parse(raw)
            break
          case '.json':
            argv.data = JSON.parse(raw)
            break
          case '.yml':
          case '.yaml':
            argv.data = yaml.safeLoad(raw)
            break
        }
      } catch (e) {
        console.log(`The token file '${tokenFile}' threw an error when parsing. Proceeding without it.`)
      }
    } else {
      console.log(`The token file '${tokenFile}' does not exist or could not be read. Proceeding without it.`)
    }
  }

  mcgonagall
    .transfigure(argv.source, {
      version: argv.apiVersion,
      output: argv.target,
      gitBasePath: argv.gitBasePath,
      data: argv.data,
      scale: argv.scale
    })
    .then(
      result => {
        if (argv.target) {
          console.log(`There. All done. See '${path.resolve(argv.target)}' for the files.`)
        } else {
          process.stdout.write(JSON.stringify(result, null, 2))
        }
      },
      err => {
        if (err.tokens) {
          console.log(`${err.tokens.length} tokens were found in the specification. When prompted, please provide a value for each.`)
          acquireTokens(err.tokens)
            .then(
              tokens => {
                if (!argv.data) {
                  argv.data = tokens
                } else {
                  Object.assign(argv.data, tokens)
                }
                transfigure(argv)
              },
              () => {
                console.error('You cannae have a specification with tokens and no data to put in their place! Have a biscuit.')
                process.exit(100)
              }
            )
        } else {
          console.error(`I'm afraid there's a problem in the specification. Have a biscuit.\n ${err}`)
          process.exit(100)
        }
      }
    )
}

require('yargs') // eslint-disable-line no-unused-expressions
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
      },
      gitBasePath: {
        alias: 'g',
        describe: 'the base path to clone git repos into',
        default: path.join(process.cwd(), 'git')
      },
      tokenFile: {
        alias: 'f',
        describe: 'supply a key/value file for any tokens in the specification'
      },
      scale: {
        alias: 's',
        describe: 'specify the scale level to apply to the cluster (if applicable)'
      }
    },
    handler: (argv) => {
      if (!/^git[:@]|^https?[:]/.test(argv.source) && !fs.existsSync(path.resolve(argv.source))) {
        console.error(`I'll not have my time wasted chasing down non-existent specifications!`)
        process.exit(100)
      }
      transfigure(argv)
    }
  })
  .demandCommand(1, 'Well? Did you need something?')
  .help()
  .version()
  .argv
