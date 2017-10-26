const _ = require('lodash')
const TAG_REGEX = /<%[+-=]?[ ]*(.*)[ ]*%>/g
const TOKEN_REGEX = /['"]?([a-z][a-zA-Z0-9_-]+)['"]?/g

function getMatches (regex, string) {
  let last
  const list = []
  do {
    last = regex.exec(string)
    if (last) {
      list.push(last[0])
    }
  } while (last)
  return _.uniq(list)
}

function getTokens (content) {
  const tags = getMatches(TAG_REGEX, content)
  const tokens = tags.reduce((acc, tag) => {
    getMatches(TOKEN_REGEX, tag)
      .forEach(token => {
        if (!/['"]/.test(token)) {
          acc.push(token)
        }
      })
    return acc
  }, [])
  return _.uniq(tokens)
}

function hasTokens (content) {
  TAG_REGEX.lastIndex = 0
  return TAG_REGEX.test(content)
}

module.exports = {
  getTokens: getTokens,
  hasTokens: hasTokens
}
