require('./setup')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const hasher = require('folder-hash')
const jsdiff = require('diff')
const rimraf = require('rimraf') // behold i am become rimraf destroyer of files
const chalk = require('chalk')
const index = require('../src/index')

const clusterSpecification = require('./clusterSpecification')
const tokenSpecification = require('./tokenSpecification')

describe('Transfiguration', function () {
  describe('from a plain spec without a target directory', function () {
    it('should create a full cluster specification object', function () {
      return index.transfigure('./spec/plain-source')
        .then(cluster => {
          return cluster.should.eql(clusterSpecification)
        })
    })
  })

  describe('from a tokenized spec without a target directory', function () {
    it('should reject with a list of tokens in the spec when data is missing', function () {
      return index.transfigure('./spec/tokenized-source')
        .then(
          null,
          err => {
            return err.should.partiallyEql({
              specPath: path.resolve('./spec/tokenized-source'),
              tokens: [
                'namespace',
                'domain'
              ]
            })
          }
        )
    })

    it('should resolve to a cluster specification with tokens resolved when data is included', function () {
      return index.transfigure('./spec/tokenized-source', {
        data: {
          domain: 'test.com',
          namespace: 'infra',
          username: 'admin',
          password: 'pass'
        }
      })
      .then(cluster => {
        return cluster.should.eql(tokenSpecification)
      })
    })
  })

  describe('from a plain spec with a target directory', function () {
    let verifyHash
    before(function () {
      return hasher.hashElement('./spec/plain-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('./spec/plain-source', { output: './spec/plain-target' })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/plain-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/plain-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.equal(json1, json2)
          } catch (e) {
            const diff = jsdiff.diffChars(json1, json2)
            diff.forEach(function (part) {
              var color = part.added ? 'green'
                : part.removed ? 'red' : 'grey'
              if (part.value !== '\n') {
                console.log(chalk[color](part.value))
              } else {
                console.log(chalk[color]('newline'))
              }
            })
          }
          return hasher.hashElement('./spec/plain-target')
        })
        .then(hash => {
          // children are compared because the top level hashes
          // include the top level folder names which differ
          // this has been tested to prove that so much as a
          // white-space character out of place will cause the
          // hash to fail on the correct file and make the diff
          // clear in the object tree as to which file is causing
          // the problem (but not why)
          return hash.children.should.eql(verifyHash.children)
        })
    })

    after(function (done) {
      rimraf('./spec/plain-target', (ohnoes) => {
        if (ohnoes) {
          console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
        }
        done()
      })
    })
  })

  describe('from a tokenized spec with a target directory', function () {
    let verifyHash
    before(function () {
      return hasher.hashElement('./spec/tokenized-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('./spec/tokenized-source', {
        output: './spec/tokenized-target',
        data: {
          namespace: 'infra',
          domain: 'test.com',
          username: 'admin',
          password: 'pass'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/tokenized-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.equal(json1, json2)
          } catch (e) {
            const diff = jsdiff.diffChars(json1, json2)
            diff.forEach(function (part) {
              var color = part.added ? 'green'
                : part.removed ? 'red' : 'grey'
              if (part.value !== '\n') {
                console.log(chalk[color](part.value))
              } else {
                console.log(chalk[color]('newline'))
              }
            })
          }
          return hasher.hashElement('./spec/tokenized-target')
        })
        .then(hash => {
          // children are compared because the top level hashes
          // include the top level folder names which differ
          // this has been tested to prove that so much as a
          // white-space character out of place will cause the
          // hash to fail on the correct file and make the diff
          // clear in the object tree as to which file is causing
          // the problem (but not why)
          return hash.children.should.eql(verifyHash.children)
        })
    })

    after(function (done) {
      rimraf('./spec/tokenized-target', (ohnoes) => {
        if (ohnoes) {
          console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
        }
        done()
      })
    })
  })

  describe('from a tokenized git repo with a target directory', function () {
    let verifyHash
    before(function () {
      return hasher.hashElement('./spec/git-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('git://github.com/arobson/elk-spec', {
        gitBasePath: './spec/git',
        output: './spec/tokenized-git',
        data: {
          namespace: 'infra',
          domain: 'test.com'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/tokenized-git/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.equal(json1, json2)
          } catch (e) {
            const diff = jsdiff.diffChars(json1, json2)
            diff.forEach(function (part) {
              var color = part.added ? 'green'
                : part.removed ? 'red' : 'grey'
              if (part.value !== '\n') {
                console.log(chalk[color](part.value))
              } else {
                console.log(chalk[color]('newline'))
              }
            })
          }
          return hasher.hashElement('./spec/tokenized-git')
        })
        .then(hash => {
          // children are compared because the top level hashes
          // include the top level folder names which differ
          // this has been tested to prove that so much as a
          // white-space character out of place will cause the
          // hash to fail on the correct file and make the diff
          // clear in the object tree as to which file is causing
          // the problem (but not why)
          return hash.children.should.eql(verifyHash.children)
        })
    })

    after(function (done) {
      rimraf('./spec/tokenized-git', (ohnoes) => {
        if (ohnoes) {
          console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
        }
      })
      rimraf('./spec/git', (ohnoes) => {
        if (ohnoes) {
          console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
        }
        done()
      })
    })
  })
})
