const normalizeUrl = require('normalize-url');

function compareUrl(url1, url2) {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

module.exports = {
  compareUrl
};
