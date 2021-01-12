function generateOperationOutcome(code, msg) {
  return {
    text: msg,
    issue: [
      {
        severity: 'error',
        code: code
      }
    ]
  };
}

module.exports = { generateOperationOutcome };
