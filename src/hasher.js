const crypto = require('crypto')
const bcrypt = require('bcrypt-nodejs')

function cryptoHash (algo, format, data) {
  const hash = crypto.createHash(algo)
  hash.update(data, 'ascii')
  return hash.digest(format)
}

function hash (algo, data, format = 'base64', salt) {
  switch (algo) {
    case 'bcrypt':
      const appliedSalt = salt || bcrypt.genSaltSync()
      const result = bcrypt.hashSync(data, appliedSalt)
      if (format !== 'base64') {
        const buffer = Buffer.from(result, 'base64')
        return buffer.toString(format)
      } else {
        return result
      }
    default:
      return cryptoHash(algo, format, data)
  }
}

module.exports = {
  hash: hash
}
