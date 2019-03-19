require('../setup')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const hasher = require('folder-hash')
const jsdiff = require('diff')
const rimraf = require('rimraf') // behold i am become rimraf destroyer of files
const chalk = require('chalk')
const index = require('../../src/index')

// controls whether or not integration tests
// remove output directories after test
const ERASE_OUTPUT = false

function eraseOutput (done, output) {
  if (ERASE_OUTPUT) {
    rimraf(`./spec/integration/target/${output}`, (ohnoes) => {
      if (ohnoes) {
        console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
      }
      done()
    })
  } else {
    done()
  }
}

const clusterSpecification = require('./verify/clusterSpecification')
const tokenSpecification = require('./verify/tokenSpecification')

describe('Transfiguration', function () {
  describe('from a plain spec without a target directory', function () {
    it('should create a full cluster specification object', function () {
      return index.transfigure('./spec/integration/source/plain-source')
        .then(cluster => {
          return cluster.should.eql(clusterSpecification)
        })
    })
  })

  describe('from a tokenized spec without a target directory', function () {
    it('should reject with a list of tokens in the spec when data is missing', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', { version: '1.7' })
        .then(
          null,
          err => {
            return err.should.partiallyEql({
              specPath: path.resolve('./spec/integration/source/tokenized-source'),
              tokens: [
                'namespace',
                'domain',
                'username',
                'password'
              ]
            })
          }
        )
    })

    it('should resolve to a cluster specification with tokens resolved when data is included', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', {
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
      return hasher.hashElement('./spec/integration/verify/plain-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('./spec/integration/source/plain-source', { output: './spec/integration/target/plain-target' })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/plain-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/plain-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)
          try {
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
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
          return hasher.hashElement('./spec/integration/target/plain-target')
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
      eraseOutput(done, 'plain-target')
    })
  })

  describe('from a spec with scale levels', function () {
    describe('when scale is small', function () {
      let verifyHash
      before(function () {
        return hasher.hashElement('./spec/integration/verify/scale-verify/small')
          .then(hash => {
            verifyHash = hash
          })
      })
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/small', scale: 'small' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/small/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/small/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            try {
              assert.deepStrictEqual(c1, c2)
              assert.strict.equal(json1, json2)
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
            return hasher.hashElement('./spec/integration/target/scale-target/small')
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
        eraseOutput(done, 'scale-target')
      })
    })

    describe('when scale is medium', function () {
      let verifyHash
      before(function () {
        return hasher.hashElement('./spec/integration/verify/scale-verify/medium')
          .then(hash => {
            verifyHash = hash
          })
      })
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/medium', scale: 'medium' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/medium/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/medium/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            try {
              assert.deepStrictEqual(c1, c2)
              assert.strict.equal(json1, json2)
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
            return hasher.hashElement('./spec/integration/target/scale-target/medium')
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
        eraseOutput(done, 'scale-target')
      })
    })

    describe('when scale is large', function () {
      let verifyHash
      before(function () {
        return hasher.hashElement('./spec/integration/verify/scale-verify/large')
          .then(hash => {
            verifyHash = hash
          })
      })
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/large', scale: 'large' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/large/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/large/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            try {
              assert.deepStrictEqual(c1, c2)
              assert.strict.equal(json1, json2)
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
            return hasher.hashElement('./spec/integration/target/scale-target/large')
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
        eraseOutput(done, 'scale-target')
      })
    })
  })

  describe('from a tokenized spec with a target directory', function () {
    let verifyHash
    before(function () {
      return hasher.hashElement('./spec/integration/verify/tokenized-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', {
        version: '1.7',
        output: './spec/integration/target/tokenized-target',
        data: {
          namespace: 'infra',
          domain: 'test.com',
          username: 'admin',
          password: 'pass'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/tokenized-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
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
          return hasher.hashElement('./spec/integration/target/tokenized-target')
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
      eraseOutput(done, 'tokenized-target')
    })
  })

  describe('from a tokenized git repo with a target directory', function () {
    let verifyHash
    before(function () {
      return hasher.hashElement('./spec/integration/verify/git-verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('git://github.com/arobson/elk-spec', {
        gitBasePath: './spec/integration/target/git',
        output: './spec/integration/target/tokenized-git',
        version: '1.7',
        data: {
          namespace: 'infra',
          domain: 'test.com'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/tokenized-git/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
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
          return hasher.hashElement('./spec/integration/target/tokenized-git')
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
      eraseOutput(() => eraseOutput(done, 'git'), 'tokenized-git')
    })
  })
})
