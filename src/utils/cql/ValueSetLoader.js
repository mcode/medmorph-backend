const _ = require('lodash');
const axios = require('axios');

class ValueSetLoader {
  constructor(library) {
    this.library = library;
  }

  async seedValueSets() {
    const map = {};
    const valueSetUrls = _.flatten(
      (this.library.dataRequirement ?? []).map(d =>
        d.codeFilter?.filter(cf => cf.valueSet).map(cf => cf.valueSet)
      )
    );

    const queries = valueSetUrls.map(async url => this.getFromUrl(url));
    const resources = await Promise.all(queries);

    resources.forEach(resource => {
      if (resource.id && resource.version && resource.compose) {
        const codes = _.flatten(
          resource.compose.include.map(i => {
            return (i.concept ?? []).map(c => ({
              code: c.code,
              system: i.system ?? ''
            }));
          })
        );

        map[resource.id] = {
          [resource.version]: codes
        };
      }
    });

    return map;
  }

  async getFromUrl(url) {
    const response = await axios.get(url);

    return response.data;
  }
}

module.exports = { ValueSetLoader };
