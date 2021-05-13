/**
 * Check if code is in value set
 * @param {string} code value to look for in a valueset
 * @param {string} codeSystem the system to which the code value belongs
 * @param {string} valueSet value set to be searched
 * @return {boolean} true if condition is in valueSet's compose block or expansion block
 */
const checkCodeInVs = (code, codeSystem, valueSet) => {
  let inVSExpansion = false;
  let inVSCompose = false;
  if (valueSet.expansion) {
    // If valueSet has expansion, we only need to check these codes
    inVSExpansion = valueSet.expansion.contains.some(containsItem => {
      if (!code || !codeSystem || !containsItem || !containsItem.system) return false;
      return code === containsItem.code && codeSystem === containsItem.system;
    });
  } else {
    // Checks if code is in any of the valueSet.compose.include arrays
    inVSCompose = valueSet.compose.include.some(includeItem => {
      if (!code || !codeSystem || !includeItem || !includeItem.system || !includeItem.concept)
        return false;
      return (
        includeItem.system === codeSystem &&
        includeItem.concept.map(concept => concept.code).includes(code)
      );
    });
  }

  return inVSCompose || inVSExpansion;
};

module.exports = {
  checkCodeInVs
};
