require('./setup')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const hasher = require('folder-hash')
const jsdiff = require('diff')
const rimraf = require('rimraf') //behold i am become rimraf destroyer of files
const chalk = require('chalk')
const index = require('../src/index')

const clusterSpecification = require('./clusterSpecification')

describe('Transfiguration', function () {
  describe('without a target directory', function () {
    it('should create a full cluster specification object', function () {
      return index.transfigure('./spec/source')
        .then(cluster => {
          return cluster.should.eql(clusterSpecification)
        })
    })
  })

  describe('with a target directory', function () {
    let verifyHash
    before(function() {
      return hasher.hashElement('./spec/verify')
        .then(hash => {
          verifyHash = hash
        })
    })
    it('should output files', function () {
      return index.transfigure('./spec/source', { output: './spec/target' })
        .then(cluster => {

          const json1 = fs.readFileSync('./spec/verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          try {
            assert.deepStrictEqual(c1, c2)
            assert.equal(json1, json2)
          } catch (e) {
            console.log(e)
            const diff = jsdiff.diffChars(json1, json2)
            diff.forEach(function(part){
              var color = part.added ? 'green' :
                part.removed ? 'red' : 'grey';
              if (part.value !== '\n') {
                console.log(chalk[color](part.value))
              } else {
                console.log(chalk[color]('newline'))
              }
            });
          }
          return hasher.hashElement('./spec/target')
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
      rimraf('./spec/target', (ohnoes) => {
        if(ohnoes) {
          console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
        }
        done()
      })
      // done()
    })
  })
})
